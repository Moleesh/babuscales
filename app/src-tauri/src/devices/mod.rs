//! Serial weight indicators and cameras (USB, IP, RTSP, ONVIF) — PLAN §16–17.
//! Reports stable readings and frames to the frontend over Tauri events; the
//! stability gate itself is a pure function in `engines/`, not here.

pub mod indicator;
pub mod printers;
