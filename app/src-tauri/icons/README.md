# Icons — placeholder

`_source.png` is a generated stand-in (dark ground, the BLS deck mark, drawn with
`System.Drawing` — not designed), and every file here was produced from it with:

```bash
npm run tauri icon src-tauri/icons/_source.png
```

This exists only so the app icon and MSI bundle a real file instead of failing the build.
It waits on the real logo — PLAN §23 open item 1. The demo's BLS mark
(`demo/BabuScales-demo.html`) is the same placeholder maker's mark, not the final design.

Once a real source image exists, replace `_source.png` and re-run the command above —
it overwrites every generated size, so nothing else here needs to change.
