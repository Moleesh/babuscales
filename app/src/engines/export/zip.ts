import { crc32 } from "./crc32";

export interface ZipEntry {
    name: string;
    data: Uint8Array<ArrayBuffer>;
}

// A fixed MS-DOS timestamp — 1 Jan 1980, the format's own earliest legal
// value (0 itself decodes to an invalid "day 0"). Nothing a report export
// writes needs a real mtime; every reader, Excel included, accepts any
// valid one.
const DOS_TIME = 0;
const DOS_DATE = 0x21;

const encoder = new TextEncoder();

const localFileHeader = (nameLength: number, crc: number, size: number): Uint8Array<ArrayBuffer> => {
    const buf = new ArrayBuffer(30);
    const view = new DataView(buf);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed to extract
    view.setUint16(6, 0, true); // general purpose flag
    view.setUint16(8, 0, true); // method: 0 = stored (no compression)
    view.setUint16(10, DOS_TIME, true);
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true); // compressed size == size (stored)
    view.setUint32(22, size, true); // uncompressed size
    view.setUint16(26, nameLength, true);
    view.setUint16(28, 0, true); // extra field length
    return new Uint8Array(buf);
};

const centralDirectoryHeader = (
    nameLength: number,
    crc: number,
    size: number,
    localHeaderOffset: number,
): Uint8Array<ArrayBuffer> => {
    const buf = new ArrayBuffer(46);
    const view = new DataView(buf);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed to extract
    view.setUint16(8, 0, true); // general purpose flag
    view.setUint16(10, 0, true); // method: stored
    view.setUint16(12, DOS_TIME, true);
    view.setUint16(14, DOS_DATE, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameLength, true);
    view.setUint16(30, 0, true); // extra field length
    view.setUint16(32, 0, true); // file comment length
    view.setUint16(34, 0, true); // disk number start
    view.setUint16(36, 0, true); // internal file attributes
    view.setUint32(38, 0, true); // external file attributes
    view.setUint32(42, localHeaderOffset, true);
    return new Uint8Array(buf);
};

const endOfCentralDirectory = (
    entryCount: number,
    centralSize: number,
    centralOffset: number,
): Uint8Array<ArrayBuffer> => {
    const buf = new ArrayBuffer(22);
    const view = new DataView(buf);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true); // disk number
    view.setUint16(6, 0, true); // disk with central directory start
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true); // comment length
    return new Uint8Array(buf);
};

/**
 * A minimal, dependency-free ZIP writer — xlsx.ts's own use case, and
 * nothing else needs a general-purpose archiver here. Every entry is
 * stored uncompressed (method 0), which the ZIP spec fully allows and
 * every reader (Excel included) accepts without complaint; the files
 * xlsx.ts writes are a few KB of XML each, not worth a deflate
 * implementation (or a third-party zip library) to shrink further.
 */
export const buildZip = (entries: ZipEntry[]): Blob => {
    const parts: BlobPart[] = [];
    const centralParts: BlobPart[] = [];
    let offset = 0;
    let centralSize = 0;

    for (const entry of entries) {
        // Fresh copies backed by a plain `ArrayBuffer` — same fix as
        // settings/_private/BackupRestoreCard.tsx's own handleExport:
        // `Uint8Array<ArrayBufferLike>` (what TextEncoder.encode and a
        // generic Uint8Array param type produce) isn't assignable to
        // `BlobPart` under this project's TS/DOM lib version.
        const nameBytes = new Uint8Array(encoder.encode(entry.name));
        const data = new Uint8Array(entry.data);
        const crc = crc32(data);
        const localHeaderOffset = offset;

        const local = localFileHeader(nameBytes.length, crc, data.length);
        parts.push(local, nameBytes, data);
        offset += local.length + nameBytes.length + data.length;

        const central = centralDirectoryHeader(nameBytes.length, crc, data.length, localHeaderOffset);
        centralParts.push(central, nameBytes);
        centralSize += central.length + nameBytes.length;
    }

    const eocd = endOfCentralDirectory(entries.length, centralSize, offset);
    return new Blob([...parts, ...centralParts, eocd], { type: "application/zip" });
};
