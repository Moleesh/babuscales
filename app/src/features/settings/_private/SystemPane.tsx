import { useEffect, useRef, useState } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { useDataPort } from "@db/useDataPort";
import { createEmailSource } from "@engines/email/createEmailSource";
// Direct subpaths, not the `@features/licensing`/`@features/reports`
// barrels — `@features/licensing`'s own LicenseProvider, and
// `@features/reports`'s own ReportsScreen, both import `useSettings` from
// this feature's barrel; going through either barrel here would close a
// cycle (settings → licensing/reports → settings). Every one of these leaf
// modules only depends on plain types/functions, so importing them
// directly skips the cycle entirely without losing anything.
import { describeLicenseState } from "@features/licensing/describeLicenseState";
import { useLicense } from "@features/licensing/useLicense";
import { buildDailySummaryEmail, todayLocalDate } from "@features/reports/dailySummaryEmail";

import { RESET_EVERY_OPTIONS } from "../settingsSchema";
import type { ResetEvery } from "../settingsSchema";
import { useSettings } from "../useSettings";
import { BackupRestoreCard } from "./BackupRestoreCard";
import styles from "./SystemPane.module.css";

// Mock's own `flash()` timing, reused from ConnectionsPane's RemoteAccessCard.
const FLASH_MS = 3000;

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

// PLAN §4.10 "licence with trial and expiry · UID machine binding", task
// #38 — the request/activate round trip is entirely offline (task #37's
// own design): this card only ever calls `@engines/licensing`'s two Tauri
// commands, never a server. `unlocked` gates Activate/Clear the same way
// every other write on this pane is gated; the status line itself is
// always visible, locked or not, since an operator needs to see "trial
// expired" without first knowing the admin password.
const LicenceCard = () => {
    const { unlocked } = useSettings();
    const license = useLicense();
    const [requestCode, setRequestCode] = useState<string | null>(null);
    const [codeInput, setCodeInput] = useState("");
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void license.requestCode().then(setRequestCode);
    }, [license]);

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (message: string): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(message);
        flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
    };

    const handleActivate = async (): Promise<void> => {
        const result = await license.activate(codeInput);
        showFlash(result.message);
        if (result.ok) setCodeInput("");
    };

    const handleClear = async (): Promise<void> => {
        await license.clearActivation();
        showFlash("Activation code cleared — back to the trial clock.");
    };

    // A code was saved at some point if the current read isn't a trial
    // state — there's nothing else `Licensed`/`Expired`/`Invalid` could
    // come from (see `licensing::evaluate`, src-tauri/src/licensing/mod.rs:
    // those three are only ever reached once `activation_code` is `Some`).
    const hasCode =
        license.state?.Kind === "Licensed" ||
        license.state?.Kind === "Expired" ||
        license.state?.Kind === "Invalid";

    return (
        <Card
            title={<span className="lbl">Licence</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <span className={license.isGated ? styles.statusBad : styles.statusOk}>
                        {license.state
                            ? describeLicenseState(license.state)
                            : license.loading
                              ? "Loading…"
                              : "Not applicable — this build has no licence to check (web demo)."}
                    </span>
                </div>
                <Field id="licReqCode" label={{ en: "Request code — send to Babulens" }}>
                    <input
                        id="licReqCode"
                        readOnly
                        value={requestCode ?? "Not available in this build"}
                        onFocus={(event) => event.target.select()}
                    />
                </Field>
                <Field id="licActCode" label={{ en: "Activation code" }}>
                    <input
                        id="licActCode"
                        placeholder="Paste the code Babulens sent back"
                        value={codeInput}
                        disabled={!unlocked}
                        onChange={(event) => setCodeInput(event.target.value)}
                    />
                </Field>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || !codeInput.trim()}
                        onClick={() => void handleActivate()}
                    >
                        Activate
                    </button>
                    {hasCode && (
                        <button
                            type="button"
                            className={`${styles.mini} ${styles.danger}`}
                            disabled={!unlocked}
                            onClick={() => void handleClear()}
                        >
                            Clear code
                        </button>
                    )}
                </div>
                <p className={styles.hint}>
                    Every install starts a free 14-day trial from first run — no account, no server.
                    To licence it, send the request code above to Babulens (see whoever supplied
                    this install for contact details — there&apos;s no in-app directory yet); they
                    sign it offline against this machine&apos;s ID and send back the activation code
                    above to paste in. Bound to this machine only — it won&apos;t work after a
                    hardware change or on a different install.
                </p>
            </div>
        </Card>
    );
};

// Task #45 — PLAN §18's "scheduled daily summary", the manual half:
// `DailySummarySync` (App.tsx) is the automatic half, checking once a
// minute whether it's time to send; this card configures what it sends to
// and when, plus a "Send now" button that runs the exact same
// build-and-send path on demand — both the fastest way to confirm the SMTP
// relay and recipient are right, and a real manual trigger in its own
// right (e.g. an admin who wants today's numbers before the scheduled
// time). `Enabled`/`Time`/`Recipient` are admin configuration, gated by
// `unlocked` like every other field on this pane; `LastSentDate` is not —
// it goes through `recordDailySummarySent` instead (see that context
// method's own doc comment).
const DailySummaryCard = () => {
    const db = useDataPort();
    const { settings, unlocked, save, recordDailySummarySent } = useSettings();
    const [email] = useState(() => createEmailSource());
    const [sending, setSending] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cfg = settings.DailySummary;

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (message: string): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(message);
        flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
    };

    const handleSendNow = async (): Promise<void> => {
        const to = cfg.Recipient.trim();
        if (!to) return;
        setSending(true);
        try {
            const today = todayLocalDate();
            const docs = await db.listDocs({ DocKind: "Ticket" });
            const { subject, body } = buildDailySummaryEmail(
                docs,
                today,
                settings.Formats.AmountDp,
            );
            const outboxRow = await db.enqueueOutbox({
                Channel: "Email",
                Body: { Kind: "DailySummary", Date: today, To: to },
            });
            const result = await email.send({
                host: settings.Smtp.Host,
                port: settings.Smtp.Port,
                username: settings.Smtp.Username,
                to,
                subject,
                body,
            });
            await db.updateOutbox(outboxRow.OutboxId, {
                State: result.Ok ? "Sent" : "Failed",
                Attempts: outboxRow.Attempts + 1,
            });
            await recordDailySummarySent(today);
            showFlash(result.Ok ? "Sent — today's summary" : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <Card
            title={<span className="lbl">Scheduled daily summary</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <label className={styles.ck}>
                    <input
                        type="checkbox"
                        checked={cfg.Enabled}
                        disabled={!unlocked}
                        onChange={(event) =>
                            void save({
                                ...settings,
                                DailySummary: { ...cfg, Enabled: event.target.checked },
                            })
                        }
                    />
                    <span>Send automatically every day</span>
                </label>
                <FieldGrid columns={2}>
                    <Field id="dsTime" label={{ en: "Send at" }}>
                        <input
                            id="dsTime"
                            type="time"
                            value={cfg.Time}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    DailySummary: { ...cfg, Time: event.target.value },
                                })
                            }
                        />
                    </Field>
                    <Field id="dsRecipient" label={{ en: "Recipient e-mail" }}>
                        <input
                            id="dsRecipient"
                            type="email"
                            placeholder="admin@example.com"
                            value={cfg.Recipient}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    DailySummary: { ...cfg, Recipient: event.target.value },
                                })
                            }
                        />
                    </Field>
                </FieldGrid>
                <div className={styles.confirmRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || sending || !cfg.Recipient.trim()}
                        onClick={() => void handleSendNow()}
                    >
                        {sending ? "Sending…" : "Send now"}
                    </button>
                </div>
                <p className={styles.hint}>
                    Goes out over the same SMTP relay as ticket e-mail (Connections → E-mail
                    delivery) — set that up first. This only runs while the app is open: it checks
                    once a minute for the scheduled time, there is no background service, so a
                    machine that&apos;s off (or asleep) at the scheduled time sends nothing until
                    it&apos;s next opened.
                    {cfg.LastSentDate && ` Last sent: ${cfg.LastSentDate}.`}
                </p>
            </div>
        </Card>
    );
};

export interface SystemPaneProps {
    /** `DataPort.resetDocSeries`'s first two args — wired at the App level, since Settings has no direct DataPort call of its own otherwise. */
    onResetTicketSeries: () => Promise<void>;
}

// System pane (demo/BabuScales-demo.html's `data-pane="sys"`) — ticket
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

            <DailySummaryCard />

            <BackupRestoreCard />

            <LicenceCard />
        </div>
    );
};
