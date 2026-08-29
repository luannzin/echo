// Windows release builds open a console window without this.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Nothing here chooses a GDK backend, and that is a decision rather than an omission.
//
// A sticky note is supposed to float, and on a Wayland session it cannot: the protocol gives a
// client no say in stacking, so `always_on_top` is a silent no-op and only the person at the
// keyboard can raise a window for good. Running the process through XWayland does restore it —
// measured, the same window comes up carrying `_NET_WM_STATE_ABOVE` there and carries no
// window-manager state at all under Wayland.
//
// It was done here, and it was reverted: on GNOME it left a window actor behind every time a
// sticky note closed. A transparent card with the compositor's own shadow around it, on whichever
// monitor it felt like, surviving every process of ours being killed — because by then there was
// nothing of ours behind it — and stacking up one per note until the session ended. Unmapping the
// window before destroying it did not stop it. A note taker that litters the desktop is worse than
// a sticky note that sits behind the window in front of it, so the floating went.
//
// Anyone who wants it back already has it, with no code and no build: `GDK_BACKEND=x11 echo`.
fn main() {
    echo_lib::run()
}
