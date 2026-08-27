//! The desktop shell, and nothing else.
//!
//! echo's database, search, learning and model all run inside the web app, so there is no business
//! logic here and there is not meant to be any: this crate opens a window onto the same build the
//! browser gets. Notifications, a tray and a global shortcut are the things Tauri is for, and each
//! one arrives when a feature actually asks for it — the dialog and filesystem plugins below are
//! here because "Save a copy" asked, and for nothing else.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("echo failed to start");
}
