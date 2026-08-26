// Windows release builds open a console window without this.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    echo_lib::run()
}
