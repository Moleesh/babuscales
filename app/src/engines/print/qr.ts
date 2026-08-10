import qrcode from "qrcode-generator";

// PLAN §18 — "every ticket carries a QR resolving to a page showing the
// authentic weighment". qrcode-generator (MIT, zero dependencies) encodes
// synchronously, so this renders straight into SlipA4's JSX with no
// useEffect/useState round trip — a self-contained `data:` URI, not a
// <canvas> element or a network request, so the print pipeline stays
// offline-safe. Type 0 lets the library auto-pick the smallest QR version
// that fits the URL; error-correction M leaves enough redundancy for a
// slightly worn or creased printed page without inflating the module count
// more than that's worth.
export const buildQrDataUri = (text: string): string => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const svg = qr.createSvgTag(4, 4);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};
