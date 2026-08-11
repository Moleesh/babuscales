import { useState } from "react";

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
// — the "Language packs" card's upload handler, unchanged from the inline
// version it replaces.
export const useLanguagePackUpload = (
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>,
): UseLanguagePackUpload => {
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);

    const handleFile = async (file: File): Promise<void> => {
        setBusy(true);
        try {
            const text = await file.text();
            const parsed = languagePackSchema.safeParse(JSON.parse(text));
            if (!parsed.success) {
                setMessage({
                    text: `Not a language pack — ${parsed.error.issues[0]?.message ?? "invalid shape"}`,
                    bad: true,
                });
                return;
            }
            await onAddLanguagePack(parsed.data);
            setMessage({
                text: `Applied · ${parsed.data.Name} · ${Object.keys(parsed.data.Strings).length} strings`,
                bad: false,
            });
        } catch (err) {
            setMessage({
                text: `Not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
                bad: true,
            });
        } finally {
            setBusy(false);
        }
    };

    return { message, busy, handleFile };
};
