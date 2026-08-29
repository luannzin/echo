# apps/desktop

## Purpose

The Tauri shell around `apps/web/out`. It exists for the things a webview cannot do for itself, and
for nothing else: the embedding model, the window frame, saving a file, and the MCP server that lets
an assistant on this machine reach echo.

## Ownership

- Owns `src-tauri/**`: the Rust crate, `tauri.conf.json`, the bundle icons and the capability files.
- Does not own the domain. There is no note, folder, category or task type anywhere in this crate,
  and adding one is the boundary breaking.

## Local Contracts

- **No business logic in Rust.** Every module here answers "what can the webview not do?" and
  carries the measurement or the platform fact that answers it. `src/lib.rs` runs the embedding
  model natively because WebKitGTK leaks ~50MB an inference and never returns it; `src/mcp.rs`
  serves MCP because a second process cannot open PGlite's IndexedDB store and would corrupt it if
  it could.
- **The MCP server knows a tool has a name, a description and a JSON Schema, and nothing more.** The
  web app declares the whole registry through `mcp_ready` and answers every call through
  `mcp_reply`; `src/mcp.rs` forwards and rewraps. Adding, changing or removing a tool is a change to
  `apps/web/shared/lib/mcp.ts` and to no file here. What the tools are, and which of them are
  deliberately absent, is `docs/ARCHITECTURE.md` rule 12.
- **The port is the web app's to name, and it never changes.** `mcp_start` binds what it is given
  and falls back to nothing: an address a client was configured with months ago has to keep working,
  and a server quietly listening somewhere the reader was never told about is worse than one that
  says it could not start. The number lives in `apps/web/shared/lib/mcp.ts` because the settings
  screen has to say it out loud when something else is holding it.
- **The registry is pushed up, never pulled down.** MCP's `initialize` carries the server's
  instructions and `get_info` is synchronous, so it cannot wait on a webview. The web app sends the
  instructions and tool list at startup and again after every reload, and the Rust side holds the
  last copy.
- **Three guards on the port, none of them optional.** Loopback bind, `Host` and `Origin`
  validation, and a bearer token in the reader's config directory at `0600`. A local port is not an
  authentication boundary — every other process on the machine can reach it. The server is off until
  the reader turns it on in settings.
- **Every Tauri plugin arrives with the feature that asked for it.** `Cargo.toml` says which feature
  that was, on the line above the dependency. A plugin added speculatively is a permission the
  reader granted for nothing.
- **The model runs the same weights the browser runs** — the quantized ONNX from the same
  repository, one text per inference. Two runtimes writing one vector space only works while both of
  those hold.

## Work Guidance

- Rust is formatted with `cargo fmt`. The repo's Biome config does not reach this crate.
- A guard that protects the reader's notes leaves a test behind. `src/mcp.rs` tests the token
  comparison and the tool-annotation passthrough; neither needs a window.

## Verification

```bash
cargo fmt --check && cargo check && cargo test
```

Run from `src-tauri/`. The two `#[ignore]` tests in `src/lib.rs` download ~135MB of weights and are
run deliberately with `cargo test -- --ignored --nocapture`.

The desktop window itself has never been exercised by an automated check — see `docs/STATE.md`.

## Child DOX Index

No children. `src-tauri/**` is one crate and one contract.
