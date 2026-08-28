// Windows release builds open a console window without this.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Puts GTK on X11 when the session is Wayland, which is the only way a sticky note can float.
///
/// Wayland gives a client no say in stacking. There is no protocol for "keep this window above the
/// others" — GNOME's compositor decides, and the only always-on-top it honours is the one a person
/// picks from the window menu themselves. `gtk_window_set_keep_above` is a silent no-op there, so
/// the sticky note opens, looks right, and sits behind whatever you switch to. Measured, not
/// assumed: the same GTK window under XWayland comes up carrying `_NET_WM_STATE_ABOVE`, and under
/// Wayland it has no window-manager state at all.
///
/// So on a Wayland session the whole application runs through XWayland. It is the whole application
/// because a GDK backend is chosen once per process, before any window exists — there is no way to
/// keep the main window native and put one sticky note on X11.
///
/// What that costs: on a screen using fractional scaling, XWayland renders text more softly than a
/// native Wayland client would. At 1x and 2x it is pixel-for-pixel the same. Anyone who would
/// rather have the sharper main window than the floating note sets `GDK_BACKEND=wayland` and this
/// steps aside — an answer already given is never overridden.
///
/// It has to happen here, before `run()`: GTK reads this when it initialises, and by the time a
/// window is being built it has long since been read.
#[cfg(target_os = "linux")]
fn prefer_x11_for_floating_windows() {
    let wayland_session = std::env::var("XDG_SESSION_TYPE").is_ok_and(|kind| kind == "wayland")
        || std::env::var_os("WAYLAND_DISPLAY").is_some();
    // Without an X server to fall back to there is nothing to prefer, and forcing it would leave
    // the application unable to open a window at all.
    let x11_available = std::env::var_os("DISPLAY").is_some();

    if wayland_session && x11_available && std::env::var_os("GDK_BACKEND").is_none() {
        std::env::set_var("GDK_BACKEND", "x11");
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    prefer_x11_for_floating_windows();

    echo_lib::run()
}
