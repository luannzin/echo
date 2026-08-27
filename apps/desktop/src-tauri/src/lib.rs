//! The desktop shell, and the one thing the webview cannot do for itself.
//!
//! echo's database, search and learning all run inside the web app, and there is deliberately no
//! business logic here. The embedding model is the exception, and it is not a preference: WebKitGTK
//! leaks roughly fifty megabytes per inference and never gives any of it back, so a few hundred
//! notes walk the web process past ten gigabytes. The identical model in the identical loop stays
//! flat at seven hundred megabytes under Chromium — the arithmetic belongs to the engine, not to the
//! model, and nothing written inside that engine gets the memory back. Recycling the worker is
//! worse than the leak: rebuilding the model there costs four gigabytes a time.
//!
//! So on the desktop the model runs out here, natively, where memory behaves. The browser build is
//! untouched and still runs it in a worker, because there it was never the problem.
//!
//! It runs *the same weights the browser runs* — the quantized ONNX from the same repository, not
//! the full-precision one the model library would otherwise fetch. That is what lets one install
//! keep the vectors the other wrote, and it keeps the first-run download at the ~135MB the product
//! already tells people about rather than quadrupling it silently.
//!
//! Notifications, a tray and a global shortcut are the things Tauri is otherwise for, and each one
//! arrives when a feature actually asks for it — the dialog and filesystem plugins below are here
//! because "Save a copy" asked, and for nothing else.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use fastembed::{
    InitOptionsUserDefined, Pooling, QuantizationMode, TextEmbedding, TokenizerFiles,
    UserDefinedEmbeddingModel,
};
use tauri::{AppHandle, Manager, State};

/// How much of a note reaches the tokenizer, in tokens. The browser runtime truncates to the same
/// 512 the model reads; the two must agree, or the same note means two different things.
const MAX_TOKENS: usize = 512;

/// Where the weights come from. The same repository and the same files the browser build fetches —
/// `model_quantized.onnx` is what transformers.js resolves to on WebAssembly, because `q8` is its
/// default there. Pointing anywhere else would produce vectors from a different space.
const MODEL_REPO: &str = "Xenova/multilingual-e5-small";
const MODEL_FILE: &str = "onnx/model_quantized.onnx";
const TOKENIZER_FILES: [&str; 4] = [
    "tokenizer.json",
    "config.json",
    "special_tokens_map.json",
    "tokenizer_config.json",
];

/// A ceiling on any single download, so a redirect to something unexpected cannot fill the disk.
/// The largest file this fetches is around 120MB.
const MAX_DOWNLOAD: u64 = 512 * 1024 * 1024;

/// The model, built on first use and then held for the life of the process.
///
/// Building it is expensive and idempotent, so it happens once, behind a lock, the first time
/// something actually asks for a vector. Nothing warms it at startup on purpose: an install that
/// opens the app and writes nothing should never pay for a model it was never asked to run.
struct Model(Mutex<Option<TextEmbedding>>);

/// e5 models expect their inputs prefixed by role; without it, retrieval quality drops sharply.
/// The browser runtime writes the same two prefixes, and a note embedded under the wrong one is not
/// wrong in any way the interface can show — it simply stops being found.
fn prefixed(role: &str, text: &str) -> String {
    format!("{role}: {text}")
}

/// One file, fetched once and kept. Downloads land beside their final name and are renamed into it,
/// so a connection dropped halfway leaves no truncated file to be trusted forever afterwards.
fn cached_file(cache: &Path, name: &str) -> Result<Vec<u8>, String> {
    let path = cache.join(name.replace('/', "_"));
    if let Ok(bytes) = fs::read(&path) {
        return Ok(bytes);
    }

    fs::create_dir_all(cache).map_err(|cause| cause.to_string())?;
    let url = format!("https://huggingface.co/{MODEL_REPO}/resolve/main/{name}");
    let partial = path.with_extension("part");

    let mut response = ureq::get(&url)
        .call()
        .map_err(|cause| format!("{name} could not be fetched: {cause}"))?;
    let mut reader = response.body_mut().with_config().limit(MAX_DOWNLOAD).reader();
    let mut file = fs::File::create(&partial).map_err(|cause| cause.to_string())?;
    io::copy(&mut reader, &mut file).map_err(|cause| format!("{name} could not be saved: {cause}"))?;
    drop(file);

    fs::rename(&partial, &path).map_err(|cause| cause.to_string())?;
    fs::read(&path).map_err(|cause| cause.to_string())
}

/// The model, assembled from files rather than from the library's own catalogue — the catalogue
/// only offers this model at full precision, and full precision is a different vector space from
/// the one every note already in the database was written in.
fn build(cache: &Path) -> Result<TextEmbedding, String> {
    let [tokenizer_file, config_file, special_tokens_map_file, tokenizer_config_file] =
        TOKENIZER_FILES.map(|name| cached_file(cache, name));

    let model = UserDefinedEmbeddingModel {
        onnx_file: cached_file(cache, MODEL_FILE)?,
        external_initializers: Vec::new(),
        tokenizer_files: TokenizerFiles {
            tokenizer_file: tokenizer_file?,
            config_file: config_file?,
            special_tokens_map_file: special_tokens_map_file?,
            tokenizer_config_file: tokenizer_config_file?,
        },
        pooling: Some(Pooling::Mean),
        // What Xenova's `_quantized` export is: int8 ranges chosen at run time rather than baked in.
        quantization: QuantizationMode::Dynamic,
        output_key: None,
    };

    TextEmbedding::try_new_from_user_defined(
        model,
        InitOptionsUserDefined::new().with_max_length(MAX_TOKENS),
    )
    .map_err(|cause| cause.to_string())
}

/// Vectors for a batch of texts. Blocking work, so it runs off the async runtime rather than
/// holding it: inference is the one thing here that takes real time.
#[tauri::command]
async fn embed(app: AppHandle, role: String, texts: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    // The caller is our own webview, but a mistyped role would degrade search silently rather than
    // fail, which is the kind of bug that gets found months later.
    if role != "query" && role != "passage" {
        return Err(format!("unknown embedding role: {role}"));
    }
    if texts.is_empty() {
        return Ok(Vec::new());
    }

    tauri::async_runtime::spawn_blocking(move || {
        let state: State<Model> = app.state();
        let mut held = state
            .0
            .lock()
            .map_err(|_| "the embedding model is unusable after an earlier panic".to_string())?;

        if held.is_none() {
            // Beside the rest of this install's data, so uninstalling takes the weights with it.
            let cache = app
                .path()
                .app_data_dir()
                .map_err(|cause| cause.to_string())?
                .join("models");
            *held = Some(build(&cache)?);
        }

        let model = held
            .as_mut()
            .expect("the model was built directly above, or this returned");

        // One text per call, deliberately. Dynamic quantization picks its int8 ranges from whatever
        // is in the batch, so the same note embedded alone and embedded alongside seven others
        // comes out as two different vectors. The browser runtime sends one text per request, and
        // matching that is the whole reason these two runtimes can share a vector space.
        texts
            .iter()
            .map(|text| {
                model
                    .embed(vec![prefixed(&role, text)], None)
                    .map_err(|cause| cause.to_string())?
                    .into_iter()
                    .next()
                    .ok_or_else(|| "the model returned no vector".to_string())
            })
            .collect()
    })
    .await
    .map_err(|cause| cause.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefixes_text_with_its_role() {
        assert_eq!(prefixed("passage", "uma nota"), "passage: uma nota");
        assert_eq!(prefixed("query", "café"), "query: café");
    }

    /// Where the tests put the weights, so running them twice downloads them once.
    fn test_cache() -> PathBuf {
        std::env::temp_dir().join("echo-model-cache")
    }

    /// The real thing: fetches the weights, runs them, and checks the shape of what comes back.
    /// Ignored by default because the first run downloads about 135MB.
    /// Run with `cargo test -- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn embeds_to_unit_vectors_of_the_expected_width() {
        let mut model = build(&test_cache()).expect("the model should build");

        let one = model
            .embed(vec![prefixed("passage", "uma nota sobre café")], None)
            .expect("embedding should succeed");
        let other = model
            .embed(vec![prefixed("passage", "a note about tea")], None)
            .expect("embedding should succeed");

        for vector in [&one[0], &other[0]] {
            assert_eq!(vector.len(), 384, "the app stores 384-wide vectors");
            let norm: f32 = vector.iter().map(|v| v * v).sum::<f32>().sqrt();
            assert!((norm - 1.0).abs() < 1e-3, "vectors should be unit length, got {norm}");
        }
        // Different notes, different directions — a model that returned the same vector for both
        // would pass every check above and make search useless.
        let dot: f32 = one[0].iter().zip(&other[0]).map(|(a, b)| a * b).sum();
        assert!(dot < 0.999, "distinct notes should not collapse to one vector, got {dot}");
    }

    /// The reason this module exists at all, kept runnable.
    ///
    /// The same loop inside WebKitGTK grows by roughly fifty megabytes an inference and never comes
    /// back down — three hundred notes cost fifteen gigabytes. This asserts the native runtime does
    /// not do that. The ceiling is deliberately loose: it is here to catch a leak, not to pin an
    /// allocator down to the megabyte.
    /// Run with `cargo test -- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn memory_stays_flat_across_many_inferences() {
        fn resident_kb() -> u64 {
            let status = fs::read_to_string("/proc/self/status").expect("procfs");
            status
                .lines()
                .find_map(|line| line.strip_prefix("VmRSS:"))
                .and_then(|value| value.split_whitespace().next()?.parse().ok())
                .expect("VmRSS")
        }

        let mut model = build(&test_cache()).expect("the model should build");
        let text = prefixed("passage", &format!("uma nota sobre {}", "café ".repeat(40)));

        // A few passes first, so the measurement starts after the allocator has settled.
        for _ in 0..10 {
            model.embed(vec![text.clone()], None).expect("warm pass");
        }

        let settled = resident_kb();
        for round in 0..300 {
            model.embed(vec![text.clone()], None).expect("embedding should succeed");
            if round % 50 == 0 {
                println!("  round {round}: {} MB", resident_kb() / 1024);
            }
        }
        let after = resident_kb();

        let grew_mb = after.saturating_sub(settled) / 1024;
        println!("settled {} MB -> after 300 inferences {} MB", settled / 1024, after / 1024);
        assert!(
            grew_mb < 256,
            "300 inferences grew resident memory by {grew_mb} MB; the webview runtime this replaces grew by ~15000 MB"
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Model(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![embed])
        .run(tauri::generate_context!())
        .expect("echo failed to start");
}
