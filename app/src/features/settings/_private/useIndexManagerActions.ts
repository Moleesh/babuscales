import { useCallback, useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { ConfigRow } from "@db/types";
import { isValidIndexPath } from "@engines/indexEngine";

// Mock's own `flash()` timing, reused from BackupRestoreCard/LicenceCard.
const FLASH_MS = 3000;

export type IndexTable = "doc" | "master";

export interface IndexDefinition {
    ConfigId: string;
    IndexName: string;
    Table: IndexTable;
    Path: string;
}

interface FlashMessage {
    text: string;
    bad: boolean;
}

export interface UseIndexManagerActions {
    indexes: IndexDefinition[];
    table: IndexTable;
    setTable: (table: IndexTable) => void;
    path: string;
    setPath: (path: string) => void;
    pathValid: boolean;
    busy: boolean;
    flash: FlashMessage | null;
    handleCreate: () => Promise<void>;
    handleDrop: (configId: string) => Promise<void>;
}

const toDefinition = (row: ConfigRow): IndexDefinition | null => {
    const body = row.Body as Partial<IndexDefinition & { Active: boolean }>;
    if (body.Active === false || typeof body.IndexName !== "string" || typeof body.Path !== "string") {
        return null;
    }
    return {
        ConfigId: row.ConfigId,
        IndexName: body.IndexName,
        Table: body.Table === "master" ? "master" : "doc",
        Path: body.Path,
    };
};

const loadIndexes = async (db: DataPort): Promise<IndexDefinition[]> => {
    const rows = await db.listConfig({ ConfigKind: "Index" });
    return rows.map(toDefinition).filter((d): d is IndexDefinition => d !== null);
};

// Plain async helpers (no hooks) for the two write paths, so
// `useIndexManagerActions` itself stays under the hook line budget
// (docs/CodingStandards.md) — each does the DataPort call plus the one
// message it reports back, and lets the caller handle busy/flash state.
const runCreate = async (
    db: DataPort,
    table: IndexTable,
    path: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
        await db.createCustomIndex(table, path);
        return { ok: true };
    } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
};

const runDrop = async (
    db: DataPort,
    configId: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
        await db.dropCustomIndex(configId);
        return { ok: true };
    } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
};

interface FlashState {
    flash: FlashMessage | null;
    showFlash: (text: string, bad?: boolean) => void;
}

// Same self-clearing-message shape as `useFlashMessage.ts`, kept separate
// here since this card also needs the bad/good colour flag that one
// doesn't carry. Factored out purely to keep `useIndexManagerActions`
// itself under the hook line budget (docs/CodingStandards.md).
const useBadFlash = (): FlashState => {
    const [flash, setFlash] = useState<FlashMessage | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (text: string, bad = false): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash({ text, bad });
        flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
    };

    return { flash, showFlash };
};

// Split out of IndexManagerCard (docs/CodingStandards.md's hook budget) —
// the definitions list, the create-form fields and the two DataPort calls
// (`createCustomIndex`/`dropCustomIndex`, src/db/DataPort.ts), unchanged
// from what the card would otherwise hold inline.
export const useIndexManagerActions = (db: DataPort): UseIndexManagerActions => {
    const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
    const [table, setTable] = useState<IndexTable>("doc");
    const [path, setPath] = useState("");
    const [busy, setBusy] = useState(false);
    const { flash, showFlash } = useBadFlash();

    const refresh = useCallback(async (): Promise<void> => {
        setIndexes(await loadIndexes(db));
    }, [db]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const handleCreate = async (): Promise<void> => {
        if (!isValidIndexPath(path)) {
            showFlash("Invalid path — use dot-separated names, e.g. VehicleNo or Address.City", true);
            return;
        }
        setBusy(true);
        const result = await runCreate(db, table, path);
        if (result.ok) {
            const created = path;
            setPath("");
            await refresh();
            showFlash(`Index created on ${table}.${created}`);
        } else {
            showFlash(`Create failed — ${result.message}`, true);
        }
        setBusy(false);
    };

    const handleDrop = async (configId: string): Promise<void> => {
        setBusy(true);
        const result = await runDrop(db, configId);
        if (result.ok) {
            await refresh();
            showFlash("Index dropped");
        } else {
            showFlash(`Drop failed — ${result.message}`, true);
        }
        setBusy(false);
    };

    return {
        indexes,
        table,
        setTable,
        path,
        setPath,
        pathValid: path.length === 0 || isValidIndexPath(path),
        busy,
        flash,
        handleCreate,
        handleDrop,
    };
};
