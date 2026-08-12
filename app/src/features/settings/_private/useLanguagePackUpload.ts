import { useState } from "react";

import { parseLangFile } from "@i18n/langFileFormat";
import { languagePackSchema } from "@i18n/schemas";
import type { LanguagePack } from "@i18n/types";

interface FlashMessage {
    text: string;
    bad: boolean;
}

export interface UseLanguagePackUpload {
    message: FlashMessage | null;
    busy: boolean;
    handleFile: (file: File) => Promise<void>;
}

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Language packs" card's upload handler. Accepts this app's own flat
// `key="value"` pack format (`.i18n/langFileFormat.ts`) as the primary path
// — a translator opens it in Notepad, no JSON syntax to get right — and
// still falls back to parsing the file as JSON (the original upload shape)
// so an existing `.json` pack from before this format existed keeps working.
export const useLanguagePackUpload = (
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>,
): UseLanguagePackUpload => {
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);

    const handleFile = async (file: File): Promise<void> => {
        setBusy(true);
        try {
            const text = await file.text();
            const looksLikeJson = text.trimStart().startsWith("{");
            const pack = looksLikeJson ? parseJsonPack(text) : parseLangPack(text);
            if ("error" in pack) {
                setMessage({ text: pack.error, bad: true });
                return;
            }
            await onAddLanguagePack(pack.pack);
            setMessage({
                text: `Applied · ${pack.pack.Name} · ${Object.keys(pack.pack.Strings).length} strings`,
                bad: false,
            });
        } catch (err) {
            setMessage({
                text: `Could not read the file — ${err instanceof Error ? err.message : String(err)}`,
                bad: true,
            });
        } finally {
            setBusy(false);
        }
    };

    return { message, busy, handleFile };
};

const parseLangPack = (text: string): { pack: LanguagePack } | { error: string } => {
    const result = parseLangFile(text);
    return "error" in result ? { error: `Not a language pack — ${result.error}` } : result;
};

const parseJsonPack = (text: string): { pack: LanguagePack } | { error: string } => {
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch (err) {
        return { error: `Not valid JSON — ${err instanceof Error ? err.message : String(err)}` };
    }
    const parsed = languagePackSchema.safeParse(json);
    return parsed.success
        ? { pack: parsed.data }
        : { error: `Not a language pack — ${parsed.error.issues[0]?.message ?? "invalid shape"}` };
};
