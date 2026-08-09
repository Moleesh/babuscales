import { useState } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";

import { RESET_EVERY_OPTIONS } from "../settingsSchema";
import type { ResetEvery } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./SystemPane.module.css";

const RESET_EVERY_LABEL: Record<ResetEvery, string> = {
    year: "Financial year",
    cal: "Calendar year",
    month: "Month",
    day: "Day",
};

const clampInt = (value: string, min: number, max: number, fallback: number): number => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

export interface SystemPaneProps {
    /** `DataPort.resetDocSeries`'s first two args — wired at the App level, since Settings has no direct DataPort call of its own otherwise. */
    onResetTicketSeries: () => Promise<void>;
}

// System pane (demo/BabuScale-demo.html's `data-pane="sys"`) — ticket
// numbering (live: prefix/width write straight through `formatTicketNo`,
// Reset actually calls `DataPort.resetDocSeries`), the admin password, and
// date/time/amount format preferences. The last three are persisted and
// editable here but nothing else in the app reads them back yet — a
// narrower version of Settings than the mock's, documented in
// app/README.md's known gaps rather than silently pretended away.
export const SystemPane = ({ onResetTicketSeries }: SystemPaneProps) => {
    const { settings, unlocked, save, changeAdminPassword } = useSettings();
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [pwFlash, setPwFlash] = useState<string | null>(null);

    const numbering = settings.Numbering;

    const handleReset = async (): Promise<void> => {
        setResetting(true);
        try {
            await onResetTicketSeries();
        } finally {
            setResetting(false);
            setConfirmingReset(false);
        }
    };

    const commitPassword = (): void => {
        const trimmed = newPassword.trim();
        if (!trimmed) return;
        void changeAdminPassword(trimmed).then(() => {
            setNewPassword("");
            setPwFlash("Admin password updated.");
            setTimeout(() => setPwFlash(null), 3000);
        });
    };

    return (
        <div className={styles.grid}>
            <Card title={<span className="lbl">Ticket numbering</span>}>
                <div className={styles.body}>
                    <FieldGrid columns={3}>
                        <Field id="numPrefix" label={{ en: "Prefix" }}>
                            <input
                                id="numPrefix"
                                value={numbering.Prefix}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Numbering: { ...numbering, Prefix: event.target.value },
                                    })
                                }
                            />
                        </Field>
                        <Field id="numWidth" label={{ en: "Digits" }}>
                            <input
                                id="numWidth"
                                type="number"
                                min={3}
                                max={9}
                                value={numbering.Width}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Numbering: {
                                            ...numbering,
                                            Width: clampInt(
                                                event.target.value,
                                                3,
                                                9,
                                                numbering.Width,
                                            ),
                                        },
                                    })
                                }
                            />
                        </Field>
                        <div />
                    </FieldGrid>
                    <div className={styles.confirmRow}>
                        {confirmingReset ? (
                            <>
                                <span>
                                    Reset the counter now? The next ticket saved starts a fresh
                                    series.
                                </span>
                                <button
                                    type="button"
                                    className={`${styles.mini} ${styles.danger}`}
                                    disabled={resetting}
                                    onClick={() => void handleReset()}
                                >
                                    {resetting ? "Resetting…" : "Yes, reset"}
                                </button>
                                <button
                                    type="button"
                                    className={styles.mini}
                                    disabled={resetting}
                                    onClick={() => setConfirmingReset(false)}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className={`${styles.mini} ${styles.danger}`}
                                disabled={!unlocked}
                                onClick={() => setConfirmingReset(true)}
                            >
                                Reset the counter now
                            </button>
                        )}
                    </div>
                    <label className={styles.ck}>
                        <input
                            type="checkbox"
                            checked={numbering.AutoReset}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Numbering: { ...numbering, AutoReset: event.target.checked },
                                })
                            }
                        />
                        <span>Also reset automatically</span>
                    </label>
                    {numbering.AutoReset && (
                        <FieldGrid columns={2}>
                            <Field id="resetEvery" label={{ en: "Every" }}>
                                <select
                                    id="resetEvery"
                                    value={numbering.ResetEvery}
                                    disabled={!unlocked}
                                    onChange={(event) =>
                                        void save({
                                            ...settings,
                                            Numbering: {
                                                ...numbering,
                                                ResetEvery: event.target.value as ResetEvery,
                                            },
                                        })
                                    }
                                >
                                    {RESET_EVERY_OPTIONS.map((value) => (
                                        <option key={value} value={value}>
                                            {RESET_EVERY_LABEL[value]}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field id="resetOn" label={{ en: "Starting" }}>
                                <input
                                    id="resetOn"
                                    value={numbering.ResetOn}
                                    disabled={!unlocked}
                                    onChange={(event) =>
                                        void save({
                                            ...settings,
                                            Numbering: {
                                                ...numbering,
                                                ResetOn: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </Field>
                        </FieldGrid>
                    )}
                </div>
            </Card>

            <Card title={<span className="lbl">Date, time &amp; amounts</span>}>
                <div className={styles.body}>
                    <FieldGrid columns={2}>
                        <Field id="setDate" label={{ en: "Date format" }}>
                            <select
                                id="setDate"
                                value={settings.Formats.DateFmt}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Formats: {
                                            ...settings.Formats,
                                            DateFmt: event.target.value,
                                        },
                                    })
                                }
                            >
                                <option value="dd MMM yyyy">dd MMM yyyy — 09 Aug 2026</option>
                                <option value="dd-MM-yyyy">dd-MM-yyyy — 09-08-2026</option>
                                <option value="dd/MM/yy">dd/MM/yy — 09/08/26</option>
                                <option value="yyyy-MM-dd">yyyy-MM-dd — 2026-08-09</option>
                            </select>
                        </Field>
                        <Field id="setTime" label={{ en: "Time format" }}>
                            <select
                                id="setTime"
                                value={settings.Formats.TimeFmt}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Formats: {
                                            ...settings.Formats,
                                            TimeFmt: event.target.value as "24" | "12",
                                        },
                                    })
                                }
                            >
                                <option value="24">24 hour — 14:32</option>
                                <option value="12">12 hour — 02:32 PM</option>
                            </select>
                        </Field>
                    </FieldGrid>
                    <FieldGrid columns={2}>
                        <Field id="setAmt" label={{ en: "Amount rounding" }}>
                            <select
                                id="setAmt"
                                value={String(settings.Formats.AmountDp)}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Formats: {
                                            ...settings.Formats,
                                            AmountDp: event.target.value === "0" ? 0 : 2,
                                        },
                                    })
                                }
                            >
                                <option value="2">2 decimals — ₹ 250.00</option>
                                <option value="0">Whole rupees — ₹ 250</option>
                            </select>
                        </Field>
                        <Field id="setAdmPw" label={{ en: "Admin password" }}>
                            <input
                                id="setAdmPw"
                                type="password"
                                autoComplete="off"
                                placeholder="New password"
                                value={newPassword}
                                disabled={!unlocked}
                                onChange={(event) => setNewPassword(event.target.value)}
                                onBlur={commitPassword}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") commitPassword();
                                }}
                            />
                        </Field>
                    </FieldGrid>
                    {pwFlash && <p className={styles.hint}>{pwFlash}</p>}
                    <p className={styles.hint}>
                        Date, time and amount formats are saved here but not yet read anywhere else
                        in the app — Reports, Dashboard and printed tickets still use the
                        browser&apos;s own formatting (known gap, app/README.md).
                    </p>
                </div>
            </Card>
        </div>
    );
};
