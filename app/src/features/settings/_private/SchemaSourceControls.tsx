import { useState } from "react";

import styles from "./_styles/FieldsLanguagePane.module.css";
import { repairJson } from "./repairJson";

// Split out of FieldSchemaCard (over the line budget — docs/CodingStandards.md)
// — everything to do with getting a schema INTO the app (drop-zone + the
// collapsible paste box), no behavior split.

// Split out so FieldSchemaCard stays under the per-function line budget
// (docs/CodingStandards.md) — purely a layout extraction, no behavior change.
export const SchemaDropZone = ({
    unlocked,
    schemaBusy,
    onSchemaFile,
    t,
}: {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaFile: (file: File) => void;
    t: (key: string) => string;
}) => (
    <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
        <span className={styles.dropIcon}>⬆</span>
        <span>
            {schemaBusy ? t("settings.fieldSchema.dropApplying") : t("settings.fieldSchema.dropPrompt")}
        </span>
        <input
            type="file"
            accept=".json,application/json"
            hidden
            disabled={schemaBusy || !unlocked}
            onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onSchemaFile(file);
            }}
        />
    </label>
);

interface PasteBoxActionsProps {
    unlocked: boolean;
    schemaBusy: boolean;
    text: string;
    t: (key: string) => string;
    onApply: () => void;
    onPrettify: () => void;
    onCancel: () => void;
}

// Split out of SchemaPasteBox (over the line budget — docs/CodingStandards.md)
// — Apply/Prettify/Cancel, all disabled the same way whenever there's
// nothing usable in the box yet.
const PasteBoxActions = ({ unlocked, schemaBusy, text, t, onApply, onPrettify, onCancel }: PasteBoxActionsProps) => (
    <div className={styles.pasteActions}>
        <button
            type="button"
            className={styles.resetButton}
            disabled={schemaBusy || !unlocked || !text.trim()}
            onClick={onApply}
        >
            {t("settings.fieldSchema.pasteApply")}
        </button>
        <button
            type="button"
            className={styles.pasteToggle}
            disabled={schemaBusy || !unlocked || !text.trim()}
            onClick={onPrettify}
        >
            {t("settings.fieldSchema.pastePrettify")}
        </button>
        <button type="button" className={styles.pasteToggle} onClick={onCancel}>
            {t("settings.fieldSchema.pasteCancel")}
        </button>
    </div>
);

interface PasteBoxFieldsProps {
    text: string;
    schemaBusy: boolean;
    unlocked: boolean;
    prettifyFailed: boolean;
    t: (key: string) => string;
    onChange: (text: string) => void;
}

// The textarea + its own inline error — split out of SchemaPasteBox purely
// to stay under the per-function line budget (docs/CodingStandards.md).
const PasteBoxFields = ({ text, schemaBusy, unlocked, prettifyFailed, t, onChange }: PasteBoxFieldsProps) => (
    <>
        <textarea
            className={styles.pasteInput}
            rows={16}
            placeholder={'{ "SchemaId": …, "Segments": […] }'}
            value={text}
            disabled={schemaBusy || !unlocked}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
        />
        {prettifyFailed && <p className={styles.bad}>{t("settings.fieldSchema.pastePrettifyFailed")}</p>}
    </>
);

// Reformats whatever's in the box with 2-space indent — the same shape the
// schemas this app hands out (resources/schemas/*.json) already use — so a
// minified or inconsistently-indented paste is easy to read/edit before
// hitting Apply. Tries the text as-is first, then falls back to a repaired
// version (trailing commas dropped, bare keys quoted) — leaves the text
// untouched (and flags the error) only if neither parses.
const prettifyJson = (text: string): string => {
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
        return JSON.stringify(JSON.parse(repairJson(text)), null, 2);
    }
};

interface PasteBoxOpenProps {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaText: (text: string) => void;
    t: (key: string) => string;
    onClose: () => void;
}

// The expanded textarea + fields + actions — split out of SchemaPasteBox
// purely to stay under the per-function line budget (docs/CodingStandards.md).
const PasteBoxOpen = ({ unlocked, schemaBusy, onSchemaText, t, onClose }: PasteBoxOpenProps) => {
    const [text, setText] = useState("");
    const [prettifyFailed, setPrettifyFailed] = useState(false);
    return (
        <div className={styles.pasteBox}>
            <PasteBoxFields
                text={text}
                schemaBusy={schemaBusy}
                unlocked={unlocked}
                prettifyFailed={prettifyFailed}
                t={t}
                onChange={(value) => {
                    setText(value);
                    setPrettifyFailed(false);
                }}
            />
            <PasteBoxActions
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                text={text}
                t={t}
                onApply={() => {
                    onSchemaText(text);
                    onClose();
                }}
                onPrettify={() => {
                    try {
                        setText(prettifyJson(text));
                        setPrettifyFailed(false);
                    } catch {
                        setPrettifyFailed(true);
                    }
                }}
                onCancel={onClose}
            />
        </div>
    );
};

// A collapsed-by-default alternative to the drop-zone above — for a schema
// copied from a chat, an editor, or another site's Settings rather than
// saved as a `.json` file. Starts as a single link so it doesn't compete
// with the drop-zone for attention; clicking it swaps in a compact
// textarea + Apply, same width as the card.
export const SchemaPasteBox = ({
    unlocked,
    schemaBusy,
    onSchemaText,
    t,
}: {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaText: (text: string) => void;
    t: (key: string) => string;
}) => {
    const [open, setOpen] = useState(false);
    if (!open) {
        return (
            <button
                type="button"
                className={styles.pasteToggle}
                disabled={!unlocked}
                onClick={() => setOpen(true)}
            >
                {t("settings.fieldSchema.pasteInstead")}
            </button>
        );
    }
    return (
        <PasteBoxOpen
            unlocked={unlocked}
            schemaBusy={schemaBusy}
            onSchemaText={onSchemaText}
            t={t}
            onClose={() => setOpen(false)}
        />
    );
};
