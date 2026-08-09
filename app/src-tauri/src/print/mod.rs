//! The Windows print path Tauri does not provide (PLAN §15.2): render the
//! template in a hidden WebView2 window, print to PDF, then hand the PDF to
//! a bundled PDF-to-RAW converter for dot-matrix and thermal targets. Every
//! `unsafe` block here is commented with its invariant — see docs/CodingStandards.md.
