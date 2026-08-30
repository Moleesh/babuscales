import { useCallback, useEffect, useState } from "react";

import type { ConfigRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";

import type { PrintTemplate, PrintTemplateDraft } from "./printTemplateTypes";
import { DEFAULT_PRINT_TEMPLATES, DEFAULT_TEMPLATE_DIMS } from "./printTemplateTypes";

// Module-level, not component state — seeding must happen at most once per
// app run even though the Printer pane (and this hook with it) mounts fresh
// every time Settings is opened. Deliberately not persisted past a restart:
// a user who deletes every template gets them back once more next launch,
// which is a much smaller surprise than a bare, purposefully-cleared table
// silently refusing to be cleared again for the rest of the app's install.
let hasSeededDefaults = false;

const numberOr = (value: unknown, fallback: number): number => (typeof value === "number" ? value : fallback);

const toTemplate = (row: ConfigRow): PrintTemplate => ({
    Id: row.ConfigId,
    Name: typeof row.Body.Name === "string" ? row.Body.Name : "",
    Html: typeof row.Body.Html === "string" ? row.Body.Html : "",
    WidthMm: numberOr(row.Body.WidthMm, DEFAULT_TEMPLATE_DIMS.WidthMm),
    HeightMm: numberOr(row.Body.HeightMm, DEFAULT_TEMPLATE_DIMS.HeightMm),
    MarginMm: numberOr(row.Body.MarginMm, DEFAULT_TEMPLATE_DIMS.MarginMm),
    IsDefault: row.Body.IsDefault === true,
});

export interface UsePrintTemplates {
    templates: PrintTemplate[];
    loading: boolean;
    saveTemplate: (draft: PrintTemplateDraft & { Id?: string }) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
}

// Same shape as useFieldSchemaUpload — CRUD straight through `useDataPort`
// (no dedicated Provider/engine like schemaEngine's, since nothing outside
// Settings needs live access to the list yet; BackupRestoreCard reaches
// `useDataPort` the same direct way for the same reason).
export const usePrintTemplates = (): UsePrintTemplates => {
    const db = useDataPort();
    const [templates, setTemplates] = useState<PrintTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        const rows = await db.listConfig({ ConfigKind: "Template" });
        setTemplates(rows.map(toTemplate));
    }, [db]);

    useEffect(() => {
        setLoading(true);
        void (async () => {
            await reload();
            if (!hasSeededDefaults) {
                hasSeededDefaults = true;
                const existing = await db.listConfig({ ConfigKind: "Template" });
                if (existing.length === 0) {
                    for (const draft of DEFAULT_PRINT_TEMPLATES) {
                        await db.saveConfig({ ConfigKind: "Template", Body: { ...draft } });
                    }
                    await reload();
                }
            }
        })().finally(() => setLoading(false));
    }, [db, reload]);

    const saveTemplate = async (draft: PrintTemplateDraft & { Id?: string }): Promise<void> => {
        await db.saveConfig({
            ...(draft.Id !== undefined ? { ConfigId: draft.Id } : {}),
            ConfigKind: "Template",
            Body: {
                Name: draft.Name,
                Html: draft.Html,
                WidthMm: draft.WidthMm,
                HeightMm: draft.HeightMm,
                MarginMm: draft.MarginMm,
                IsDefault: draft.IsDefault,
            },
        });
        await reload();
    };

    const deleteTemplate = async (id: string): Promise<void> => {
        await db.deleteConfig(id);
        await reload();
    };

    return { templates, loading, saveTemplate, deleteTemplate };
};
