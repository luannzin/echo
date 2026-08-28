//! The door other programs knock on, and nothing behind it.
//!
//! An AI assistant that can read and write a reader's notes is a useful thing, and every note echo
//! has is inside the webview: PGlite lives in IndexedDB, which no second process can open — and
//! would corrupt if it could, because PGlite takes one writer. So the server that answers the
//! outside world has to run in this process, and the work it asks for has to happen in that one.
//!
//! This module is the transport half and it is deliberately ignorant. It knows a tool has a name, a
//! description and a JSON Schema; it does not know what a note is, what a folder is, or which of
//! these calls will change something. The web app declares all of that through `mcp_ready` and
//! answers every call through `mcp_reply`. That keeps the rule the rest of this crate keeps — the
//! domain runs in the web app on every host — and it means adding a tool is a change to one
//! TypeScript file and to nothing here.
//!
//! Three things guard the port, and none of them is optional for a server that can delete notes:
//! it binds loopback only, it validates `Host` and `Origin` so a page in the reader's browser
//! cannot drive it, and it requires a bearer token that lives in the reader's config directory.
//! Localhost is not an authentication boundary — every other process on the machine can reach the
//! port too.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{header::AUTHORIZATION, StatusCode};
use axum::middleware::{self, Next};
use axum::response::Response;
use axum::routing::any;
use axum::Router;
use rmcp::model::{
    CallToolRequestParams, CallToolResponse, CallToolResult, ErrorData, Implementation,
    ListToolsResult, PaginatedRequestParams, ServerCapabilities, ServerInfo, Tool, ToolAnnotations,
};
use rmcp::service::RequestContext;
use rmcp::transport::streamable_http_server::session::local::LocalSessionManager;
use rmcp::transport::StreamableHttpService;
use rmcp::{RoleServer, ServerHandler};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Emitter, Manager, State as Managed};
use tokio::sync::oneshot;

/// How long a tool call may wait on the web app before the caller is told it did not answer.
///
/// Generous on purpose: a search runs the embedding model, and the model's first call is also its
/// download. A caller that gives up at five seconds would give up on the one call that was always
/// going to be slow.
const CALL_TIMEOUT: Duration = Duration::from_secs(60);

/// The window the tools run in. The sticky notes are their own windows with no database behind
/// them, so a call sent to whichever window happened to be focused would reach a webview that
/// cannot answer it.
const HOST_WINDOW: &str = "main";

/// What `Origin` is allowed to be. Command-line MCP clients send no `Origin` at all and are
/// unaffected; a page running in the reader's browser always sends its own, which will never be
/// this, so it is refused before it reaches a tool. Not a real origin, and not meant to be — the
/// list only has to be non-empty for rmcp to start checking.
const ALLOWED_ORIGIN: &str = "app://echo";

/// One tool, exactly as the web app describes it. Everything here is passed through.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolSpec {
    name: String,
    description: String,
    input_schema: Map<String, Value>,
    /// MCP's hints — read-only, destructive, idempotent. Hints, and clients may ignore them, which
    /// is why the web app also refuses a destructive call it does not like.
    #[serde(default)]
    read_only: bool,
    #[serde(default)]
    destructive: bool,
    #[serde(default)]
    idempotent: bool,
}

impl From<&ToolSpec> for Tool {
    fn from(spec: &ToolSpec) -> Self {
        let mut annotations = ToolAnnotations::default();
        annotations.read_only_hint = Some(spec.read_only);
        annotations.destructive_hint = Some(spec.destructive);
        annotations.idempotent_hint = Some(spec.idempotent);
        Tool::new(
            spec.name.clone(),
            spec.description.clone(),
            spec.input_schema.clone(),
        )
        .with_annotations(annotations)
    }
}

/// What the web app has told us it can do. Held rather than fetched, because `get_info` — where the
/// instructions have to appear — is synchronous and cannot wait for a webview.
#[derive(Default)]
struct Registry {
    instructions: String,
    tools: Vec<Tool>,
}

/// Calls in flight, and the window they were sent to.
struct Bridge {
    app: AppHandle,
    pending: Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>,
    next: AtomicU64,
}

impl Bridge {
    async fn call(&self, tool: &str, args: Value) -> Result<Value, String> {
        let window = self
            .app
            .get_webview_window(HOST_WINDOW)
            .ok_or("echo's window is not open")?;

        let id = self.next.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = oneshot::channel();
        self.pending
            .lock()
            .expect("the pending map is never held across an await")
            .insert(id, sender);

        if let Err(cause) = window.emit("mcp:call", json!({ "id": id, "tool": tool, "args": args }))
        {
            self.forget(id);
            return Err(cause.to_string());
        }

        match tokio::time::timeout(CALL_TIMEOUT, receiver).await {
            Ok(Ok(answer)) => answer,
            // The window went away, or was reloaded, between the emit and the answer.
            Ok(Err(_)) => Err("echo stopped before it answered".into()),
            Err(_) => {
                self.forget(id);
                Err("echo did not answer in time".into())
            }
        }
    }

    fn forget(&self, id: u64) {
        self.pending
            .lock()
            .expect("the pending map is never held across an await")
            .remove(&id);
    }
}

/// The MCP server itself: a registry it did not write and a bridge it sends everything over.
#[derive(Clone)]
struct EchoMcp {
    registry: Arc<RwLock<Registry>>,
    bridge: Arc<Bridge>,
}

impl ServerHandler for EchoMcp {
    fn get_info(&self) -> ServerInfo {
        let registry = self
            .registry
            .read()
            .expect("the registry lock is never poisoned");
        ServerInfo::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("echo", env!("CARGO_PKG_VERSION")))
            .with_instructions(registry.instructions.clone())
    }

    async fn list_tools(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        let registry = self
            .registry
            .read()
            .expect("the registry lock is never poisoned");
        Ok(ListToolsResult::with_all_items(registry.tools.clone()))
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        let arguments = Value::Object(request.arguments.unwrap_or_default());
        // A tool that refused is a tool that ran and said no — the caller needs to read the reason,
        // and a JSON-RPC error would be rendered as an opaque internal failure instead.
        let result = match self.bridge.call(&request.name, arguments).await {
            Ok(value) => CallToolResult::structured(value),
            Err(reason) => CallToolResult::structured_error(json!({ "error": reason })),
        };
        Ok(result.into())
    }
}

/// Everything the desktop shell holds for the server: what to serve, and whether it is serving.
pub struct McpState {
    registry: Arc<RwLock<Registry>>,
    bridge: Arc<Bridge>,
    running: Mutex<Option<Running>>,
    token: String,
}

struct Running {
    port: u16,
    /// Dropped to stop the server. Sending is how the axum task is asked to shut down.
    stop: Option<oneshot::Sender<()>>,
}

/// What a reader needs in order to point something at echo.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint {
    url: String,
    token: String,
}

pub fn state(app: &AppHandle) -> Result<McpState, String> {
    Ok(McpState {
        registry: Arc::new(RwLock::new(Registry::default())),
        bridge: Arc::new(Bridge {
            app: app.clone(),
            pending: Mutex::new(HashMap::new()),
            next: AtomicU64::new(1),
        }),
        running: Mutex::new(None),
        token: token(app)?,
    })
}

/// The bearer token, made once and kept. Written `0600` where the platform has file modes: it is
/// the only thing standing between another process on this machine and the reader's notes.
fn token(app: &AppHandle) -> Result<String, String> {
    let path: PathBuf = app
        .path()
        .app_config_dir()
        .map_err(|cause| cause.to_string())?
        .join("mcp-token");

    if let Ok(existing) = fs::read_to_string(&path) {
        let existing = existing.trim().to_string();
        if !existing.is_empty() {
            return Ok(existing);
        }
    }

    // Two v4 UUIDs: 256 bits from the same generator Tauri already trusts for its own identifiers,
    // and nothing here needs to be prettier than that.
    let fresh = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|cause| cause.to_string())?;
    }
    fs::write(&path, &fresh).map_err(|cause| cause.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|cause| cause.to_string())?;
    }
    Ok(fresh)
}

/// What the web app can do, declared by the web app. Sent once at startup and again whenever the
/// window reloads, which is why it replaces rather than merges.
#[tauri::command]
pub fn mcp_ready(state: Managed<'_, McpState>, instructions: String, tools: Vec<ToolSpec>) {
    let mut registry = state
        .registry
        .write()
        .expect("the registry lock is never poisoned");
    registry.instructions = instructions;
    registry.tools = tools.iter().map(Tool::from).collect();
}

/// One tool call, answered. `error` carries the reason a tool refused or failed; the caller sees it.
#[tauri::command]
pub fn mcp_reply(
    state: Managed<'_, McpState>,
    id: u64,
    result: Option<Value>,
    error: Option<String>,
) {
    let sender = state.pending_sender(id);
    if let Some(sender) = sender {
        let _ = sender.send(match error {
            Some(reason) => Err(reason),
            None => Ok(result.unwrap_or(Value::Null)),
        });
    }
}

impl McpState {
    fn pending_sender(&self, id: u64) -> Option<oneshot::Sender<Result<Value, String>>> {
        self.bridge
            .pending
            .lock()
            .expect("the pending map is never held across an await")
            .remove(&id)
    }
}

#[tauri::command]
pub async fn mcp_start(state: Managed<'_, McpState>) -> Result<Endpoint, String> {
    if let Some(running) = state
        .running
        .lock()
        .expect("not held across an await")
        .as_ref()
    {
        return Ok(endpoint(running.port, &state.token));
    }

    let service = StreamableHttpService::new(
        {
            let registry = state.registry.clone();
            let bridge = state.bridge.clone();
            move || {
                Ok(EchoMcp {
                    registry: registry.clone(),
                    bridge: bridge.clone(),
                })
            }
        },
        Arc::new(LocalSessionManager::default()),
        {
            let mut config =
                rmcp::transport::streamable_http_server::StreamableHttpServerConfig::default();
            // Stateless request-and-response: every tool call here is one question and one answer,
            // and a session to keep would only be state to lose on reload.
            config.legacy_session_mode = false;
            config.json_response = true;
            config.allowed_origins = vec![ALLOWED_ORIGIN.into()];
            config
        },
    );

    // Port zero: the operating system picks one that is free, so a second copy of echo — or
    // anything else already holding a number we liked — cannot stop the server from starting.
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0))
        .await
        .map_err(|cause| format!("the port could not be opened: {cause}"))?;
    let port = listener
        .local_addr()
        .map_err(|cause| cause.to_string())?
        .port();

    let router = Router::new()
        .route("/mcp", any(forward))
        .with_state(service)
        .layer(middleware::from_fn_with_state(
            state.token.clone(),
            authorize,
        ));

    let (stop, stopped) = oneshot::channel();
    tauri::async_runtime::spawn(async move {
        let served = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await;
        if let Err(cause) = served {
            eprintln!("[echo] the MCP server stopped: {cause}");
        }
    });

    *state.running.lock().expect("not held across an await") = Some(Running {
        port,
        stop: Some(stop),
    });
    Ok(endpoint(port, &state.token))
}

#[tauri::command]
pub fn mcp_stop(state: Managed<'_, McpState>) {
    if let Some(mut running) = state
        .running
        .lock()
        .expect("not held across an await")
        .take()
    {
        if let Some(stop) = running.stop.take() {
            let _ = stop.send(());
        }
    }
}

fn endpoint(port: u16, token: &str) -> Endpoint {
    Endpoint {
        url: format!("http://127.0.0.1:{port}/mcp"),
        token: token.to_string(),
    }
}

/// The bearer token, checked before anything else runs.
async fn authorize(
    State(expected): State<String>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let offered = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    if !permitted(offered, &expected) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(request).await)
}

/// Whether an `Authorization` header may pass. Compared whole rather than by prefix, and a missing
/// header is a refusal rather than a default — the one place where "we could not tell" must not
/// mean "let it through", because everything behind it can delete notes.
fn permitted(offered: Option<&str>, expected: &str) -> bool {
    let Some(offered) = offered.and_then(|value| value.strip_prefix("Bearer ")) else {
        return false;
    };
    !offered.is_empty() && !expected.is_empty() && offered == expected
}

/// rmcp's transport is a `tower` service and axum wants its own body type, so the response is
/// rewrapped on the way out. `poll_ready` for this service is always ready, which is why it is
/// called directly rather than through a readiness dance that would never wait.
async fn forward(
    State(mut service): State<StreamableHttpService<EchoMcp, LocalSessionManager>>,
    request: Request,
) -> Response {
    let answered = tower_service::Service::call(&mut service, request)
        .await
        .expect("this service is infallible");
    let (parts, body) = answered.into_parts();
    Response::from_parts(parts, Body::new(body))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The gate in front of everything. A local port is not a boundary — every other process on
    /// this machine can reach it — so the only thing separating them from the reader's notes is
    /// this comparison, and every way of getting it wrong is a way of losing the notes.
    #[test]
    fn only_the_whole_token_gets_in() {
        let token = "a1b2c3";
        assert!(permitted(Some("Bearer a1b2c3"), token));

        assert!(!permitted(None, token), "a missing header is a refusal");
        assert!(!permitted(Some(""), token));
        assert!(
            !permitted(Some("Bearer "), token),
            "an empty token is not a token"
        );
        assert!(
            !permitted(Some("a1b2c3"), token),
            "the scheme is part of the header"
        );
        assert!(
            !permitted(Some("Bearer a1b2"), token),
            "a prefix is not the token"
        );
        assert!(!permitted(Some("Bearer a1b2c3x"), token));
        assert!(
            !permitted(Some("Bearer A1B2C3"), token),
            "case is part of it"
        );
        assert!(!permitted(Some("Basic a1b2c3"), token));
        // Before the web app has ever run there is nothing to match; nothing may match it either.
        assert!(!permitted(Some("Bearer "), ""));
    }

    /// The web app describes its tools and this crate passes them through. What it must not do is
    /// quietly drop the hints that tell a caller which of them destroy something.
    #[test]
    fn a_tool_keeps_what_the_web_app_said_about_it() {
        let spec: ToolSpec = serde_json::from_value(json!({
            "name": "delete_note",
            "description": "Delete an archived note for good.",
            "inputSchema": { "type": "object" },
            "readOnly": false,
            "destructive": true,
            "idempotent": false,
        }))
        .expect("the web app's shape should deserialize");

        let tool = Tool::from(&spec);
        assert_eq!(tool.name, "delete_note");
        let annotations = tool.annotations.expect("annotations should be carried");
        assert_eq!(annotations.destructive_hint, Some(true));
        assert_eq!(annotations.read_only_hint, Some(false));
    }

    /// Hints are optional on the wire and absent must mean the careful answer, not the convenient
    /// one: a tool nobody described is a tool that might destroy something.
    #[test]
    fn a_tool_that_says_nothing_is_not_assumed_harmless() {
        let spec: ToolSpec = serde_json::from_value(json!({
            "name": "mystery",
            "description": "Undescribed.",
            "inputSchema": { "type": "object" },
        }))
        .expect("the hints should be optional");

        assert_eq!(
            Tool::from(&spec).annotations.and_then(|a| a.read_only_hint),
            Some(false)
        );
    }
}
