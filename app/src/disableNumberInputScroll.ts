// Chrome/Edge (and so Tauri's webview) change a focused `<input
// type="number">`'s value on mouse-wheel scroll — surprising when the field
// just happens to sit under the cursor while the operator scrolls the page
// past it. Blurring the field on wheel is the standard fix: it stops the
// browser's own number-input wheel handler without touching scroll
// elsewhere on the page. One document-level listener covers every number
// input app-wide, present and future, instead of wiring an onWheel prop
// onto each of the ~9 places `type="number"` is used today.
document.addEventListener(
    "wheel",
    (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type === "number" && document.activeElement === target) {
            target.blur();
        }
    },
    { passive: true },
);
