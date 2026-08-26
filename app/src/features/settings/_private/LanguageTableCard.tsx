import { useEffect, useMemo, useState } from "react";

import { AppModal } from "@components/AppModal";
import { Card } from "@components/Card";
import { ConfirmDeleteModal } from "@components/ConfirmDeleteModal";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Select } from "@components/Select";
import { Tooltip } from "@components/Tooltip";
import { EN_STRINGS } from "@i18n/strings";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/LanguagePane.module.css";
import { AddLanguageForm } from "./AddLanguageForm";

interface KeyRow {
    key: string;
}

type Status = "edited" | "missing" | "default";

// "green for edited, red for missing" — a key is "missing" when the picked
// pack's own value for it is empty (an admin cleared it, or a hand-authored
// pack never had it — `Strings[key]` falls all the way back to `""`, not
// English, since `?? EN_STRINGS[key]` would hide the gap); "edited" is
// anything that diverges from the English default without being empty;
// everything else is still the English copy an "Add language" seeded it
// with and hasn't been looked at yet.
const statusOf = (pack: LanguagePack | null, key: string): Status => {
    if (!pack) return "default";
    const value = pack.Strings[key] ?? "";
    if (value === "") return "missing";
    return value === EN_STRINGS[key] ? "default" : "edited";
};

export interface LanguageTableCardProps {
    packs: LanguagePack[];
    unlocked: boolean;
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    /** Hard-deletes a language pack's `config` row. Task: "delete the package". */
    onDeleteLanguagePack: (code: string) => Promise<void>;
    /** Codes that ship in source (`@i18n/packs`) and so can never actually
     * disappear — the delete icon is disabled for these (see LanguagePane's
     * own doc comment on `BUILT_IN_CODES`). */
    builtInCodes: string[];
    /** Bug: "when another language is selected it to change the top language
     * also" — this picker used to own its selection as local state, so
     * App.tsx's top-bar toggle chip had no way to see it. Now controlled by
     * I18nProvider's shared `otherLangCode`/`setOtherLangCode` (see
     * I18nContext.ts's own doc comment) so both stay in sync. */
    selectedCode: string | null;
    onSelectCode: (code: string) => void;
}

// Task: "for language lets change it to something like this ... no need
// search, also change the table header better also we can double tap to
// edit it, we will have a button to add more language on create we will
// copy everything from english, we can also select the second language
// here, we can update it should show a different color" — replaces the old
// upload-a-.lang-file card (LanguagePacksCard) entirely. Follow-up "edited
// is only for english can we make that edited too" made the English column
// double-click editable too, same as the picked-language column — its edits
// land in their own "en" override pack (see `commitEnglishEdit`) instead of
// touching `EN_STRINGS` itself, which stays the immutable fallback both
// columns compare against for their green/red status. The third column is
// whichever one pack the header's own dropdown currently has picked, so
// editing one language at a time never turns into an unreadably wide
// all-languages grid.
export const LanguageTableCard = ({
    packs,
    unlocked,
    onAddLanguagePack,
    onDeleteLanguagePack,
    builtInCodes,
    selectedCode,
    onSelectCode,
}: LanguageTableCardProps) => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
    // Task: "bring all the possible labels for the field schema together" —
    // a field's own on-screen label lives under a `<namespace>.label.<Key>`
    // key (e.g. `weighing.label.EstimatedWeight`, the field-schema-driven
    // labels on the weighing screen) — a dedicated pill groups every one of
    // those regardless of which namespace they're under, instead of hunting
    // for them one namespace at a time.
    const [labelOnly, setLabelOnly] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [editingEnglishKey, setEditingEnglishKey] = useState<string | null>(null);
    const [englishDraft, setEnglishDraft] = useState("");
    // Task: "add a small edit icon and delete icon in the dropdown of the
    // language, which we will use to edit the language name or delete the
    // package (delete needs confirmation)" — rename reuses the same "open a
    // small AppModal, submit a name" shape as AddLanguageForm; delete reuses
    // MasterFormActions' own confirm-before-hard-delete shape (its own doc
    // comment: the browser's native `window.confirm()` read as broken/
    // un-themed).
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameDraft, setRenameDraft] = useState("");
    const [renameError, setRenameError] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // "en" is English's own override pack (created the first time someone
    // edits an English cell — see `commitEnglishEdit` below), not a language
    // an admin picks from the dropdown: it's what the English column reads
    // from once it has any edits, same shape as every other pack. Kept out
    // of `otherPacks` so it can't also show up as a pickable "second
    // language" and can't collide with a brand-new pack's own code.
    const enPack = packs.find((pack) => pack.Code === "en") ?? null;
    const otherPacks = useMemo(() => packs.filter((pack) => pack.Code !== "en"), [packs]);

    const selectedPack = otherPacks.find((pack) => pack.Code === selectedCode) ?? null;
    // Falls back to the first available pack whenever the current selection
    // doesn't resolve to one — covers both "nothing picked yet" (mounted
    // before any packs existed) and "the picked pack's `Code` disappeared"
    // (shouldn't normally happen, but keeps the picker from silently
    // pointing at nothing either way).
    useEffect(() => {
        const first = otherPacks[0];
        if (!selectedPack && first) onSelectCode(first.Code);
    }, [selectedPack, otherPacks, onSelectCode]);

    const allKeys = useMemo(() => Object.keys(EN_STRINGS), []);
    const rows: KeyRow[] = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        let keys = needle ? allKeys.filter((key) => key.toLowerCase().includes(needle)) : allKeys;
        if (statusFilter !== "all") keys = keys.filter((key) => statusOf(selectedPack, key) === statusFilter);
        if (labelOnly) keys = keys.filter((key) => key.split(".")[1] === "label");
        return keys.map((key) => ({ key }));
    }, [allKeys, filter, statusFilter, labelOnly, selectedPack]);

    const commitEdit = (key: string): void => {
        setEditingKey(null);
        if (!selectedPack) return;
        const value = draft;
        if (value === (selectedPack.Strings[key] ?? "")) return;
        void onAddLanguagePack({ ...selectedPack, Strings: { ...selectedPack.Strings, [key]: value } });
    };

    // English's own values live in code (`EN_STRINGS`), not a `config` row —
    // the first edit here creates its override pack (`Code: "en"`) the same
    // way every other pack is created, seeded from whatever's already been
    // overridden plus this one change, so later edits layer on top of it
    // instead of each starting from a fresh full copy.
    const commitEnglishEdit = (key: string): void => {
        setEditingEnglishKey(null);
        const value = englishDraft;
        const current = enPack?.Strings[key] ?? EN_STRINGS[key];
        if (value === current) return;
        const base = enPack ?? { Code: "en", Name: "English", Version: 1, Strings: {} };
        void onAddLanguagePack({ ...base, Strings: { ...base.Strings, [key]: value } });
    };

    const createLanguage = (pack: LanguagePack): void => {
        void onAddLanguagePack(pack).then(() => onSelectCode(pack.Code));
    };

    const openRename = (): void => {
        if (!selectedPack) return;
        setRenameDraft(selectedPack.Name);
        setRenameError(null);
        setRenameOpen(true);
    };

    const submitRename = (): void => {
        if (!selectedPack) return;
        const trimmedName = renameDraft.trim();
        if (!trimmedName) {
            setRenameError(t("settings.languagePane.renameIncomplete"));
            return;
        }
        void onAddLanguagePack({ ...selectedPack, Name: trimmedName });
        setRenameOpen(false);
    };

    const confirmDelete = (): void => {
        if (!selectedPack) return;
        setDeleteConfirmOpen(false);
        void onDeleteLanguagePack(selectedPack.Code);
    };

    const selectedIsBuiltIn = !!selectedPack && builtInCodes.includes(selectedPack.Code);

    const columns: DataTableColumn<KeyRow>[] = [
        {
            key: "key",
            header: t("settings.languagePane.col.key"),
            width: 300,
            render: (row) => (
                <Tooltip label={row.key} onlyWhenTruncated className={styles.truncateWrap}>
                    <span className={styles.keyCell}>{row.key}</span>
                </Tooltip>
            ),
        },
        {
            key: "en",
            header: t("settings.languagePane.col.english"),
            render: (row) => {
                if (editingEnglishKey === row.key) {
                    return (
                        <input
                            autoFocus
                            className={styles.editInput}
                            value={englishDraft}
                            disabled={!unlocked}
                            onChange={(event) => setEnglishDraft(event.target.value)}
                            onBlur={() => commitEnglishEdit(row.key)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") commitEnglishEdit(row.key);
                                if (event.key === "Escape") setEditingEnglishKey(null);
                            }}
                        />
                    );
                }
                const value = enPack?.Strings[row.key] ?? EN_STRINGS[row.key] ?? "";
                const status = statusOf(enPack, row.key);
                const statusClass =
                    status === "edited" ? styles.valueTranslated : status === "missing" ? styles.valueMissing : "";
                return (
                    <Tooltip label={value || t("settings.languagePane.missing")} onlyWhenTruncated className={styles.truncateWrap}>
                        <span
                            className={`${styles.englishCell} ${statusClass}`}
                            onClick={() => {
                                if (!unlocked) return;
                                setEnglishDraft(value);
                                setEditingEnglishKey(row.key);
                            }}
                        >
                            {status === "missing" ? t("settings.languagePane.missing") : value}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            key: "lang",
            header: (
                <span className={styles.langHeader}>
                    {otherPacks[0] ? (
                        <>
                            <Select
                                id="language-pane-picker"
                                className={styles.langSelect}
                                value={selectedCode ?? otherPacks[0].Code}
                                options={otherPacks.map((pack) => ({ value: pack.Code, label: pack.Name }))}
                                onChange={onSelectCode}
                            />
                            <button
                                type="button"
                                className={styles.langIconButton}
                                disabled={!unlocked || !selectedPack}
                                title={t("settings.languagePane.renameLabel")}
                                aria-label={t("settings.languagePane.renameLabel")}
                                onClick={openRename}
                            >
                                ✎
                            </button>
                            <button
                                type="button"
                                className={`${styles.langIconButton} ${styles.langIconButtonDanger}`}
                                disabled={!unlocked || !selectedPack || selectedIsBuiltIn}
                                title={
                                    selectedIsBuiltIn
                                        ? t("settings.languagePane.deleteBuiltInHint")
                                        : t("settings.languagePane.deleteLabel")
                                }
                                aria-label={t("settings.languagePane.deleteLabel")}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                🗑
                            </button>
                        </>
                    ) : (
                        t("settings.languagePane.col.language")
                    )}
                </span>
            ),
            render: (row) => {
                if (!selectedPack) return <span className={styles.noLanguage}>—</span>;
                if (editingKey === row.key) {
                    return (
                        <input
                            autoFocus
                            className={styles.editInput}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={() => commitEdit(row.key)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") commitEdit(row.key);
                                if (event.key === "Escape") setEditingKey(null);
                            }}
                        />
                    );
                }
                const value = selectedPack.Strings[row.key] ?? "";
                const status = statusOf(selectedPack, row.key);
                const statusClass =
                    status === "edited" ? styles.valueTranslated : status === "missing" ? styles.valueMissing : "";
                return (
                    <Tooltip label={value || t("settings.languagePane.missing")} onlyWhenTruncated className={styles.truncateWrap}>
                        <span
                            className={`${styles.valueCell} ${statusClass}`}
                            onClick={() => {
                                if (!unlocked) return;
                                setDraft(value);
                                setEditingKey(row.key);
                            }}
                        >
                            {status === "missing" ? t("settings.languagePane.missing") : value}
                        </span>
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <Card
            // Bug: "title is not sticky" — off by default (CardProps'
            // own doc comment); the pane's `.pane-area` (SettingsScreen.
            // module.css) is the actual scroll region now, so this needs
            // opting in the same way Reports' own Card already does.
            sticky
            title={<span className="lbl">{t("settings.languagePane.title")}</span>}
            headerRight={
                <span className="chip num">
                    {otherPacks.length} {t("settings.languagePacks.installedSuffix")}
                </span>
            }
        >
            <div className={styles.body}>
                <div className={styles.toolbar}>
                    <input
                        className={styles.filter}
                        placeholder={t("settings.languagePane.filterPlaceholder")}
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                    />
                    {/* Task: "remove everthing here and just add all edited
                        (edited english), label(from field json), missed" —
                        the field-namespace pills (one per dotted key prefix —
                        adm, cameras, reports, weighing, …) were noise; the bar
                        is now just the three status pills it started as. */}
                    <div className={styles.filterBar} role="group" aria-label={t("settings.languagePane.filterBarLabel")}>
                        <button
                            type="button"
                            className={styles.filterPill}
                            aria-pressed={statusFilter === "all" && !labelOnly}
                            onClick={() => {
                                setStatusFilter("all");
                                setLabelOnly(false);
                            }}
                        >
                            {t("settings.languagePane.statusAll")}
                        </button>
                        <button
                            type="button"
                            className={styles.filterPill}
                            aria-pressed={statusFilter === "edited"}
                            onClick={() => setStatusFilter(statusFilter === "edited" ? "all" : "edited")}
                        >
                            {t("settings.languagePane.statusEdited")}
                        </button>
                        <button
                            type="button"
                            className={styles.filterPill}
                            aria-pressed={statusFilter === "missing"}
                            onClick={() => setStatusFilter(statusFilter === "missing" ? "all" : "missing")}
                        >
                            {t("settings.languagePane.statusMissing")}
                        </button>
                        <button
                            type="button"
                            className={styles.filterPill}
                            aria-pressed={labelOnly}
                            onClick={() => setLabelOnly((previous) => !previous)}
                        >
                            {t("settings.languagePane.statusLabel")}
                        </button>
                    </div>
                    <AddLanguageForm
                        existingCodes={["en", ...otherPacks.map((pack) => pack.Code)]}
                        unlocked={unlocked}
                        onCreate={createLanguage}
                    />
                </div>
                <DataTable
                    columns={columns}
                    rows={rows}
                    getRowId={(row) => row.key}
                    emptyMessage={t("settings.languagePane.empty")}
                    tableClassName={styles.fixedTable}
                />
            </div>
            {selectedPack && (
                <AppModal
                    open={renameOpen}
                    title={t("settings.languagePane.renameTitle")}
                    onClose={() => setRenameOpen(false)}
                    size="small"
                >
                    <div className={styles.addModalBody}>
                        <label className={styles.addModalField}>
                            <span>{t("settings.languagePane.addName")}</span>
                            <input
                                autoFocus
                                className={styles.addInput}
                                value={renameDraft}
                                onChange={(event) => setRenameDraft(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && submitRename()}
                            />
                        </label>
                        {renameError && <span className={styles.bad}>{renameError}</span>}
                        <button type="button" className={styles.addButton} onClick={submitRename}>
                            {t("settings.languagePane.renameLabel")}
                        </button>
                    </div>
                </AppModal>
            )}
            {selectedPack && (
                <ConfirmDeleteModal
                    open={deleteConfirmOpen}
                    title={t("settings.languagePane.deleteConfirmTitle")}
                    message={t("settings.languagePane.deleteConfirm")}
                    name={selectedPack.Name}
                    confirmLabel={t("settings.languagePane.deleteLabel")}
                    onCancel={() => setDeleteConfirmOpen(false)}
                    onConfirm={confirmDelete}
                />
            )}
        </Card>
    );
};
