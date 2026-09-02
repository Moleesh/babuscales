# Icons — placeholder

`_source.svg` is a generated stand-in (dark ground, the BS deck mark — the same maker's mark
drawn in-app by `AppShell/_private/BrandMark.tsx`, not designed as a real logo), and every file
here was produced from it with:

```bash
npm run tauri icon src-tauri/icons/_source.svg
```

This exists only so the app icon, taskbar icon, tray icon and NSIS bundle all reference one
real, consistent file instead of failing the build or drifting apart (the app previously shipped a
`_source.png` reading "BLS" here against the in-app header's "BS" — that mismatch is why this now
generates from a single SVG matching the header mark exactly). It waits on the real logo — PLAN
§23 open item 1. The demo's mark (`demo/BabuScales-demo.html`) is the same placeholder maker's
mark, not the final design.

Only the sizes `tauri.conf.json`'s `bundle.icon` list and the Rust tray-icon code actually use are
kept here — `tauri icon`'s default run also generates iOS/Windows-Store variants (`ios/`,
`Square*Logo.png`, `StoreLogo.png`); this is a Windows-only desktop app (`bundle.targets`:
`nsis`), so those are deleted after each regeneration rather than committed.

Once a real source image exists, replace `_source.svg` and re-run the command above — it
overwrites every generated size, so nothing else here needs to change.
