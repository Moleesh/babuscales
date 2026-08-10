import { useEffect, useMemo, useState } from "react";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Field, FieldGrid } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { formatMoney } from "@constants/numberFormat";
import { getMaterialRate } from "@db/materialBody";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { MasterKind, MasterRow } from "@db/types";
import { useMasterCache } from "@db/useMasterCache";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { MASTER_KIND_META, MASTER_KIND_ORDER } from "./masterKindMeta";
import styles from "./MastersScreen.module.css";

interface MasterFormState {
    name: string;
    notes: string;
    weightKg: string;
    capturedAt: string;
    partyName: string;
    rate: string;
    email: string;
    phone: string;
}

const emptyForm = (): MasterFormState => ({
    name: "",
    notes: "",
    weightKg: "",
    capturedAt: "",
    partyName: "",
    rate: "",
    email: "",
    phone: "",
});

const toDateTimeLocal = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formFromRow = (row: MasterRow): MasterFormState => {
    if (row.MasterKind === "StoredTare" && isStoredTareBody(row.Body)) {
        return {
            name: row.Name,
            notes: "",
            weightKg: String(row.Body.WeightKg),
            capturedAt: toDateTimeLocal(row.Body.CapturedAt),
            partyName: row.Body.PartyName ?? "",
            rate: "",
            email: "",
            phone: "",
        };
    }
    const rate = getMaterialRate(row.Body);
    return {
        name: row.Name,
        notes: typeof row.Body.Notes === "string" ? row.Body.Notes : "",
        weightKg: "",
        capturedAt: "",
        partyName: "",
        rate: rate !== null ? String(rate) : "",
        email: typeof row.Body.Email === "string" ? row.Body.Email : "",
        phone: typeof row.Body.Phone === "string" ? row.Body.Phone : "",
    };
};

// PLAN §9.1 — one screen for everything saved: Parties, Materials,
// Vehicles, Vehicle Types, Transporters, Places, Operators, Stored Tares.
// FTS5 search, row virtualisation, keyset pagination, merge-duplicates and
// bulk import/export are the real §9.1 spec at 100,000-row scale — not
// built yet, tracked as a known gap (app/README.md); client-side filtering
// over a per-kind cache (useMasterCache) covers demo/site-sized data today.
export const MastersScreen = () => {
    const { lang } = useTranslation();
    const [activeKind, setActiveKind] = useState<MasterKind>("Party");
    const { rows, loading, search, save, reload } = useMasterCache(activeKind);
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<MasterFormState>(emptyForm());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setQuery("");
        setSelectedId(null);
        setForm(emptyForm());
    }, [activeKind]);

    const filtered = useMemo(() => search(query), [search, query]);
    const selected = selectedId ? (rows.find((row) => row.MasterId === selectedId) ?? null) : null;
    const meta = MASTER_KIND_META[activeKind];

    const kindOptions: SegmentedOption<MasterKind>[] = MASTER_KIND_ORDER.map((kind) => ({
        value: kind,
        label: resolveLocalized(MASTER_KIND_META[kind].Label, lang),
    }));

    const selectRow = (row: MasterRow): void => {
        setSelectedId(row.MasterId);
        setForm(formFromRow(row));
    };

    const startNew = (): void => {
        setSelectedId(null);
        setForm(emptyForm());
    };

    const handleSave = async (): Promise<void> => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const body =
                activeKind === "StoredTare"
                    ? {
                          WeightKg: Number(form.weightKg) || 0,
                          CapturedAt: form.capturedAt
                              ? new Date(form.capturedAt).toISOString()
                              : new Date().toISOString(),
                          PartyName: form.partyName.trim() || undefined,
                      }
                    : activeKind === "Material"
                      ? {
                            Notes: form.notes.trim() || undefined,
                            Rate: form.rate.trim() ? Number(form.rate) : undefined,
                        }
                      : activeKind === "Party"
                        ? {
                              Notes: form.notes.trim() || undefined,
                              // Task #42 — real e-mail delivery looks a
                              // ticket's party up by name and reads this
                              // field; empty means "no e-mail on file",
                              // same "skip quietly" shape as an empty
                              // PartyName on a stored tare above.
                              Email: form.email.trim() || undefined,
                              // Task #43 — same lookup, for SMS via the
                              // GSM modem instead of SMTP.
                              Phone: form.phone.trim() || undefined,
                          }
                        : { Notes: form.notes.trim() || undefined };
            const row = await save({
                MasterId: selected?.MasterId,
                MasterKind: activeKind,
                Name: form.name.trim(),
                Body: body,
                IsActive: selected?.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (): Promise<void> => {
        if (!selected) return;
        setSaving(true);
        try {
            const row = await save({
                MasterId: selected.MasterId,
                MasterKind: activeKind,
                Name: selected.Name,
                Body: selected.Body,
                IsActive: !selected.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };

    const columns: DataTableColumn<MasterRow>[] =
        activeKind === "StoredTare"
            ? [
                  { key: "name", header: "Vehicle", render: (row) => row.Name },
                  {
                      key: "weight",
                      header: "Weight",
                      numeric: true,
                      render: (row) =>
                          isStoredTareBody(row.Body) ? `${row.Body.WeightKg} kg` : "—",
                  },
                  {
                      key: "age",
                      header: "Age",
                      numeric: true,
                      render: (row) => {
                          if (!isStoredTareBody(row.Body)) return "—";
                          const days = storedTareAgeDays(row.Body.CapturedAt);
                          const stale = isStoredTareStale(row.Body.CapturedAt);
                          return (
                              <span className={stale ? styles.stale : undefined}>
                                  {days}d{stale ? " ⚠" : ""}
                              </span>
                          );
                      },
                  },
                  {
                      key: "party",
                      header: "Party",
                      render: (row) =>
                          isStoredTareBody(row.Body) ? (row.Body.PartyName ?? "—") : "—",
                  },
                  {
                      key: "active",
                      header: "Status",
                      render: (row) => (row.IsActive ? "Active" : "Inactive"),
                  },
              ]
            : [
                  { key: "name", header: "Name", render: (row) => row.Name },
                  activeKind === "Material"
                      ? {
                            key: "rate",
                            header: "Rate / t",
                            numeric: true,
                            render: (row) => {
                                const rate = getMaterialRate(row.Body);
                                return rate !== null ? formatMoney(rate, 2) : "—";
                            },
                        }
                      : activeKind === "Party"
                        ? {
                              key: "email",
                              header: "E-mail",
                              render: (row) =>
                                  typeof row.Body.Email === "string" ? row.Body.Email : "—",
                          }
                        : {
                              key: "notes",
                              header: "Notes",
                              render: (row) =>
                                  typeof row.Body.Notes === "string" ? row.Body.Notes : "—",
                          },
                  ...(activeKind === "Party"
                      ? [
                            {
                                key: "phone",
                                header: "Phone",
                                render: (row: MasterRow) =>
                                    typeof row.Body.Phone === "string" ? row.Body.Phone : "—",
                            } satisfies DataTableColumn<MasterRow>,
                        ]
                      : []),
                  {
                      key: "active",
                      header: "Status",
                      render: (row) => (row.IsActive ? "Active" : "Inactive"),
                  },
                  {
                      key: "updated",
                      header: "Updated",
                      render: (row) => new Date(row.UpdatedAt).toLocaleString(),
                  },
              ];

    return (
        <div className={styles.screen}>
            <SegmentedControl
                options={kindOptions}
                value={activeKind}
                onChange={setActiveKind}
                ariaLabel="Master kind"
            />

            <Card
                title={<span className="lbl">{resolveLocalized(meta.Label, lang)}</span>}
                headerRight={<span className="chip num">{rows.length}</span>}
            >
                <div className={styles.body}>
                    <input
                        className={styles.search}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={resolveLocalized(meta.SearchPlaceholder, lang)}
                        aria-label={resolveLocalized(meta.SearchPlaceholder, lang)}
                    />
                    <DataTable
                        columns={columns}
                        rows={filtered}
                        getRowId={(row) => row.MasterId}
                        onRowClick={selectRow}
                        emptyMessage={
                            loading
                                ? "Loading…"
                                : `No ${resolveLocalized(meta.Label, lang).toLowerCase()} yet`
                        }
                    />
                </div>
            </Card>

            <Card
                title={
                    <span className="lbl">
                        {selected
                            ? `Edit — ${selected.Name}`
                            : resolveLocalized(meta.AddNewLabel, lang)}
                    </span>
                }
            >
                <div className={styles.body}>
                    {activeKind === "StoredTare" ? (
                        <FieldGrid columns={2}>
                            <Field id="mfName" label={{ en: "Vehicle No" }}>
                                <input
                                    id="mfName"
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                    autoComplete="off"
                                />
                            </Field>
                            <Field id="mfWeight" label={{ en: "Weight (kg)" }}>
                                <input
                                    id="mfWeight"
                                    type="number"
                                    inputMode="numeric"
                                    value={form.weightKg}
                                    onChange={(event) =>
                                        setForm({ ...form, weightKg: event.target.value })
                                    }
                                />
                            </Field>
                            <Field id="mfCaptured" label={{ en: "Captured at" }}>
                                <input
                                    id="mfCaptured"
                                    type="datetime-local"
                                    value={form.capturedAt}
                                    onChange={(event) =>
                                        setForm({ ...form, capturedAt: event.target.value })
                                    }
                                />
                            </Field>
                            <Field id="mfParty" label={{ en: "Party" }}>
                                <input
                                    id="mfParty"
                                    value={form.partyName}
                                    onChange={(event) =>
                                        setForm({ ...form, partyName: event.target.value })
                                    }
                                    autoComplete="off"
                                />
                            </Field>
                        </FieldGrid>
                    ) : (
                        <FieldGrid
                            columns={
                                activeKind === "Party"
                                    ? 4
                                    : activeKind === "Material"
                                      ? 3
                                      : 2
                            }
                        >
                            <Field id="mfName" label={{ en: "Name" }}>
                                <input
                                    id="mfName"
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                    autoComplete="off"
                                />
                            </Field>
                            <Field id="mfNotes" label={{ en: "Notes" }}>
                                <input
                                    id="mfNotes"
                                    value={form.notes}
                                    onChange={(event) =>
                                        setForm({ ...form, notes: event.target.value })
                                    }
                                    autoComplete="off"
                                />
                            </Field>
                            {activeKind === "Material" && (
                                <Field id="mfRate" label={{ en: "Rate / t" }}>
                                    <input
                                        id="mfRate"
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        value={form.rate}
                                        onChange={(event) =>
                                            setForm({ ...form, rate: event.target.value })
                                        }
                                    />
                                </Field>
                            )}
                            {activeKind === "Party" && (
                                // Task #42 — read at print time so "Send a
                                // copy by e-mail" has somewhere to send to.
                                // Optional: an empty Masters record just
                                // means that party's tickets never enqueue
                                // an Email outbox row, same as no phone
                                // number means no SMS.
                                <Field id="mfEmail" label={{ en: "E-mail" }}>
                                    <input
                                        id="mfEmail"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) =>
                                            setForm({ ...form, email: event.target.value })
                                        }
                                        autoComplete="off"
                                    />
                                </Field>
                            )}
                            {activeKind === "Party" && (
                                // Task #43 — read at print time so "Send a
                                // copy by SMS" has somewhere to send to.
                                // Optional, same "skip quietly" shape as
                                // an empty E-mail above.
                                <Field id="mfPhone" label={{ en: "Phone" }}>
                                    <input
                                        id="mfPhone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={(event) =>
                                            setForm({ ...form, phone: event.target.value })
                                        }
                                        autoComplete="off"
                                    />
                                </Field>
                            )}
                        </FieldGrid>
                    )}
                    <div className={styles.formActions}>
                        <Button
                            variant="primary"
                            disabled={saving || !form.name.trim()}
                            onClick={() => void handleSave()}
                        >
                            {selected ? "Save changes" : resolveLocalized(meta.AddNewLabel, lang)}
                        </Button>
                        {selected && (
                            <Button
                                variant={selected.IsActive ? "danger" : "default"}
                                disabled={saving}
                                onClick={() => void toggleActive()}
                            >
                                {selected.IsActive ? "Deactivate" : "Activate"}
                            </Button>
                        )}
                        {selected && (
                            <Button disabled={saving} onClick={startNew}>
                                New
                            </Button>
                        )}
                        <Button disabled={saving} onClick={() => reload()}>
                            Refresh
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
