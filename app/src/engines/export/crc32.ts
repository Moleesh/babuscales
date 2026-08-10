// Standard IEEE 802.3 CRC-32 (the ZIP/PNG/gzip polynomial), table-based —
// the one piece of the hand-rolled xlsx writer (zip.ts) that needs a
// well-known, bit-exact algorithm rather than app-specific logic. Every
// ZIP local/central file header carries this for each entry's raw bytes.
const CRC_TABLE = ((): Uint32Array => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

export const crc32 = (bytes: Uint8Array): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        // `bytes[i]` is in-range by the loop bound and `CRC_TABLE`'s index
        // is always `& 0xff` (0-255, within its fixed 256-entry table) —
        // both non-null under noUncheckedIndexedAccess's own worst case.
        const byte = bytes[i] ?? 0;
        crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
};
