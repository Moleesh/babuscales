import { useEffect, useRef, useState } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { formatWeightKg } from "@constants/numberFormat";
import { createEmailSource } from "@engines/email/createEmailSource";
import { isSerialIndicatorSource, useIndicator, useIndicatorReading } from "@engines/indicator";
import { createSmsSource } from "@engines/sms/createSmsSource";
import { useTunnel } from "@engines/tunnel";
import { useVerificationServer } from "@engines/verification";

import { BAUD_RATE_OPTIONS, INTEGRATION_FIXTURES } from "../settingsSchema";
import type { IntegrationFixture, IntegrationKey } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./ConnectionsPane.module.css";

// Mock's own `flash()`: a transient message that self-clears after 3s (same
// timing SystemPane's password-change confirmation already uses).
const FLASH_MS = 3000;

interface IntegrationRowProps {
    fixture: IntegrationFixture;
    on: boolean;
    unlocked: boolean;
    onToggle: () => void;
    onConfigure: () => void;
}

const IntegrationRow = ({ fixture, on, unlocked, onToggle, onConfigure }: IntegrationRowProps) => (
    <div className={`${styles.tpl} ${on ? styles.tplOn : ""}`}>
        <span className={styles.tplName}>{fixture.name}</span>
        {on && <span className={styles.badge}>on</span>}
        <span className={styles.tplMeta}>{fixture.config}</span>
        <span className={styles.tplActs}>
            <button type="button" className={styles.mini} disabled={!unlocked} onClick={onToggle}>
                {on ? "Turn off" : "Turn on"}
            </button>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked}
                onClick={onConfigure}
            >
                Configure
            </button>
        </span>
    </div>
);

const IntegrationsCard = () => {
    const { settings, unlocked, save } = useSettings();
    const verificationServer = useVerificationServer();
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const toggle = (key: IntegrationKey, name: string): void => {
        const next = !settings.Integrations[key];
        void save({
            ...settings,
            Integrations: { ...settings.Integrations, [key]: next },
        });
        showFlash(`${name} ${next ? "enabled" : "disabled"}`);
    };

    // Real for QR verification, e-mail and SMS — everything else stays the
    // mock's own "here's where this would be configured" placeholder
    // (app/README.md known gap). WhatsApp specifically will never join that
    // list: PLAN §23 open item 5 flags it as "the only per-message cost",
    // and task #44 (app/README.md item 31) recorded why there's no
    // compliant free path to wire it to — Meta's Cloud API is paid, and the
    // unofficial alternative violates WhatsApp's own Terms of Service.
    const configure = async (fixture: IntegrationFixture): Promise<void> => {
        if (fixture.key === "qr") {
            if (!settings.Integrations.qr) {
                showFlash("QR verification page — turn it on first to see its address");
                return;
            }
            const status =
                (await verificationServer.status()) ?? (await verificationServer.start());
            showFlash(
                status
                    ? `QR verification page — ${status.LanUrl ?? status.LoopbackUrl}`
                    : "QR verification page — desktop app only, not available in this build",
            );
            return;
        }
        if (fixture.key === "email") {
            showFlash("E-mail — SMTP host, port, username and password set below, not here");
            return;
        }
        if (fixture.key === "sms") {
            showFlash("SMS gateway — modem port and baud rate set below, not here");
            return;
        }
        showFlash(`${fixture.name} · ${fixture.config} — stored in the settings table`);
    };

    return (
        <Card
            title={<span className="lbl">Integrations</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.tpls}>
                {INTEGRATION_FIXTURES.map((fixture) => (
                    <IntegrationRow
                        key={fixture.key}
                        fixture={fixture}
                        on={settings.Integrations[fixture.key]}
                        unlocked={unlocked}
                        onToggle={() => toggle(fixture.key, fixture.name)}
                        onConfigure={() => void configure(fixture)}
                    />
                ))}
            </div>
        </Card>
    );
};

// PLAN §18's own separate "Remote access — Cloudflare Tunnel" spec — not
// one of the mock's INTEGRATIONS fixtures (it isn't in demo/BabuScales-demo.html
// at all), so it gets its own card rather than a ninth IntegrationRow. The
// connector token itself never touches `settings` — it's typed here, sent
// straight to `tunnel.saveToken` (src-tauri/src/security/mod.rs, Windows
// Credential Manager), and the input is cleared immediately after; only
// `hasToken` (a yes/no, fetched fresh, never the value itself) stays in
// local state. `RemoteAccess.Enabled` is the one part of "on or off" that
// is ordinary config, same shape as every other Settings toggle.
const RemoteAccessCard = () => {
    const { settings, unlocked, save } = useSettings();
    const tunnel = useTunnel();
    const [tokenInput, setTokenInput] = useState("");
    const [hasToken, setHasToken] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void tunnel.hasToken().then(setHasToken);
    }, [tunnel]);

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

    const enabled = settings.RemoteAccess.Enabled;

    const toggleEnabled = (): void => {
        const next = !enabled;
        void save({ ...settings, RemoteAccess: { ...settings.RemoteAccess, Enabled: next } });
        showFlash(`Remote access ${next ? "enabled" : "disabled"}`);
    };

    const saveToken = async (): Promise<void> => {
        const trimmed = tokenInput.trim();
        if (!trimmed) return;
        await tunnel.saveToken(trimmed);
        setTokenInput("");
        setHasToken(true);
        showFlash("Tunnel token saved");
    };

    const clearToken = async (): Promise<void> => {
        await tunnel.clearToken();
        setHasToken(false);
        showFlash("Tunnel token cleared — connector stopped");
    };

    const checkStatus = async (): Promise<void> => {
        const status = await tunnel.status();
        if (!status) {
            showFlash("Remote access — desktop app only, not available in this build");
            return;
        }
        if (status.State === "Running") {
            showFlash(`Remote access — connected${status.Message ? ` (${status.Message})` : ""}`);
        } else if (status.State === "Failed") {
            showFlash(`Remote access — stopped: ${status.Message ?? "cloudflared exited"}`);
        } else {
            showFlash("Remote access — stopped");
        }
    };

    return (
        <Card
            title={<span className="lbl">Remote access</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked}
                        onClick={toggleEnabled}
                    >
                        {enabled ? "Turn off" : "Turn on"}
                    </button>
                    <span className={enabled ? styles.statusOk : styles.hint}>
                        {enabled ? "Enabled" : "Disabled"} — opt-in, off by default
                    </span>
                </div>
                <Field id="tunnelToken" label={{ en: "Cloudflare Tunnel token" }}>
                    <input
                        id="tunnelToken"
                        type="password"
                        autoComplete="off"
                        placeholder={
                            hasToken
                                ? "•••••••• saved — paste a new one to replace it"
                                : "Paste the connector token from the Cloudflare dashboard"
                        }
                        value={tokenInput}
                        disabled={!unlocked}
                        onChange={(event) => setTokenInput(event.target.value)}
                    />
                </Field>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || !tokenInput.trim()}
                        onClick={() => void saveToken()}
                    >
                        Save token
                    </button>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || !hasToken}
                        onClick={() => void clearToken()}
                    >
                        Clear token
                    </button>
                    <button
                        type="button"
                        className={styles.mini}
                        onClick={() => void checkStatus()}
                    >
                        Check status
                    </button>
                    <span className={hasToken ? styles.statusOk : styles.hint}>
                        {hasToken ? "Token saved" : "No token saved"}
                    </span>
                </div>
                <p className={styles.hint}>
                    Republishes the LAN verification page (port 8420) publicly through a tunnel you
                    create on the Cloudflare Zero Trust dashboard — create it there, map a public
                    hostname to http://localhost:8420, then paste its connector token above. The
                    token goes straight to the Windows Credential Manager, never to this app&apos;s
                    database. Requires cloudflared to already be installed and on PATH — this app
                    never downloads it. Only the verification page rides this tunnel today; there is
                    no remote admin surface yet.
                </p>
            </div>
        </Card>
    );
};

// Task #42's real Email/SMTP ticket delivery — not one of the mock's
// INTEGRATIONS fixtures either (its own "Configure" there stays a stub, see
// `configure` above), same reasoning as RemoteAccessCard just above: the
// host/port/username are ordinary Settings config (`settings.Smtp`), the
// password goes straight to `email.savePassword` (Windows Credential
// Manager), and only `hasPassword` (never the value) stays in local state.
// "Send a test e-mail" is the one way to actually prove a relay works
// short of printing a real ticket — same value as RemoteAccessCard's
// "Check status" button.
const EmailCard = () => {
    const { settings, unlocked, save } = useSettings();
    const [email] = useState(() => createEmailSource());
    const [passwordInput, setPasswordInput] = useState("");
    const [hasPassword, setHasPassword] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [sending, setSending] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void email.hasPassword().then(setHasPassword);
    }, [email]);

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

    const smtp = settings.Smtp;

    const savePassword = async (): Promise<void> => {
        const trimmed = passwordInput.trim();
        if (!trimmed) return;
        await email.savePassword(trimmed);
        setPasswordInput("");
        setHasPassword(true);
        showFlash("SMTP password saved");
    };

    const clearPassword = async (): Promise<void> => {
        await email.clearPassword();
        setHasPassword(false);
        showFlash("SMTP password cleared");
    };

    const sendTest = async (): Promise<void> => {
        const to = testTo.trim();
        if (!to) return;
        setSending(true);
        try {
            const result = await email.send({
                host: smtp.Host,
                port: smtp.Port,
                username: smtp.Username,
                to,
                subject: "BabuScales — test e-mail",
                body: "This is a test message from BabuScales' Settings → Connections pane. If it arrived, this SMTP configuration works.",
            });
            showFlash(result.Ok ? `Test e-mail sent to ${to}` : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <Card
            title={<span className="lbl">E-mail delivery</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <FieldGrid columns={2}>
                    <Field id="smtpHost" label={{ en: "SMTP host" }}>
                        <input
                            id="smtpHost"
                            placeholder="smtp.example.com"
                            value={smtp.Host}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Smtp: { ...smtp, Host: event.target.value },
                                })
                            }
                        />
                    </Field>
                    <Field id="smtpPort" label={{ en: "Port" }}>
                        <input
                            id="smtpPort"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={65535}
                            value={smtp.Port}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Smtp: { ...smtp, Port: Number(event.target.value) || 587 },
                                })
                            }
                        />
                    </Field>
                </FieldGrid>
                <Field id="smtpUsername" label={{ en: "Username / from address" }}>
                    <input
                        id="smtpUsername"
                        type="email"
                        placeholder="tickets@example.com"
                        value={smtp.Username}
                        disabled={!unlocked}
                        onChange={(event) =>
                            void save({
                                ...settings,
                                Smtp: { ...smtp, Username: event.target.value },
                            })
                        }
                    />
                </Field>
                <Field id="smtpPassword" label={{ en: "Password" }}>
                    <input
                        id="smtpPassword"
                        type="password"
                        autoComplete="off"
                        placeholder={
                            hasPassword
                                ? "•••••••• saved — type a new one to replace it"
                                : "SMTP account password"
                        }
                        value={passwordInput}
                        disabled={!unlocked}
                        onChange={(event) => setPasswordInput(event.target.value)}
                    />
                </Field>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || !passwordInput.trim()}
                        onClick={() => void savePassword()}
                    >
                        Save password
                    </button>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || !hasPassword}
                        onClick={() => void clearPassword()}
                    >
                        Clear password
                    </button>
                    <span className={hasPassword ? styles.statusOk : styles.hint}>
                        {hasPassword ? "Password saved" : "No password saved"}
                    </span>
                </div>
                <Field id="smtpTestTo" label={{ en: "Send a test e-mail to" }}>
                    <input
                        id="smtpTestTo"
                        type="email"
                        placeholder="you@example.com"
                        value={testTo}
                        disabled={!unlocked}
                        onChange={(event) => setTestTo(event.target.value)}
                    />
                </Field>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || sending || !testTo.trim()}
                        onClick={() => void sendTest()}
                    >
                        {sending ? "Sending…" : "Send test"}
                    </button>
                </div>
                <p className={styles.hint}>
                    Read at print time when Integrations → E-mail is on: a ticket&apos;s party
                    needs an E-mail saved in Masters (Settings → Masters → Parties) to receive a
                    copy. Most providers want port 587 with STARTTLS and an app-specific password
                    rather than your normal login password — check your provider&apos;s SMTP
                    documentation if the test above fails.
                </p>
            </div>
        </Card>
    );
};

// Task #43's real SMS delivery via a serial-attached GSM modem — the same
// "own Card, not one of the mock's INTEGRATIONS fixtures" shape as
// EmailCard just above, but with its own port/baud picker (like the
// indicator's below, reusing BAUD_RATE_OPTIONS) instead of a password:
// AT commands over a local serial port need no auth. "Send a test SMS" is
// the same proof-it-works button as EmailCard's "Send test".
const SmsCard = () => {
    const { settings, unlocked, save } = useSettings();
    const [sms] = useState(() => createSmsSource());
    const [ports, setPorts] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [sending, setSending] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const conn = settings.Connections;

    const refreshPorts = (): void => {
        setRefreshing(true);
        void sms
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    };

    useEffect(() => {
        refreshPorts();
        // refreshPorts is stable enough for this — same one-shot-on-mount
        // shape as ConnectionsPane's own port-scan effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sms]);

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

    const sendTest = async (): Promise<void> => {
        const to = testTo.trim();
        if (!to) return;
        setSending(true);
        try {
            const result = await sms.send({
                port: conn.GsmPort,
                baud: conn.GsmBaud,
                to,
                message:
                    "BabuScales - test SMS. If this arrived, this GSM modem configuration works.",
            });
            showFlash(result.Ok ? `Test SMS sent to ${to}` : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <Card
            title={<span className="lbl">SMS delivery</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <FieldGrid columns={2}>
                    <Field id="gsmPort" label={{ en: "Modem serial port" }}>
                        <select
                            id="gsmPort"
                            value={conn.GsmPort}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Connections: { ...conn, GsmPort: event.target.value },
                                })
                            }
                        >
                            <option value="">Not connected</option>
                            {ports.map((port) => (
                                <option key={port} value={port}>
                                    {port}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field id="gsmBaud" label={{ en: "Baud rate" }}>
                        <select
                            id="gsmBaud"
                            value={conn.GsmBaud}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Connections: { ...conn, GsmBaud: Number(event.target.value) },
                                })
                            }
                        >
                            {BAUD_RATE_OPTIONS.map((baud) => (
                                <option key={baud} value={baud}>
                                    {baud}
                                </option>
                            ))}
                        </select>
                    </Field>
                </FieldGrid>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={refreshing}
                        onClick={refreshPorts}
                    >
                        {refreshing ? "Scanning…" : "Rescan ports"}
                    </button>
                    <span className={conn.GsmPort ? styles.statusOk : styles.hint}>
                        {conn.GsmPort ? `Configured — ${conn.GsmPort}` : "No port selected."}
                    </span>
                </div>
                <Field id="gsmTestTo" label={{ en: "Send a test SMS to" }}>
                    <input
                        id="gsmTestTo"
                        type="tel"
                        placeholder="+91XXXXXXXXXX"
                        value={testTo}
                        disabled={!unlocked}
                        onChange={(event) => setTestTo(event.target.value)}
                    />
                </Field>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || sending || !testTo.trim()}
                        onClick={() => void sendTest()}
                    >
                        {sending ? "Sending…" : "Send test"}
                    </button>
                </div>
                <p className={styles.hint}>
                    Read at print time when Integrations → SMS gateway is on: a ticket&apos;s party
                    needs a Phone saved in Masters (Settings → Masters → Parties) to receive a text.
                    Talks to the modem over plain AT commands (AT+CMGF, AT+CMGS) — any GSM modem or
                    phone that exposes a serial/USB AT interface works, no cloud SMS-gateway account
                    needed.
                </p>
            </div>
        </Card>
    );
};

// Connections pane (demo/BabuScales-demo.html's `data-pane="conn"`) — PLAN
// §17's setup wizard, scoped down to what one iteration can actually
// deliver and verify: choose a port and baud, an optional custom regex
// pattern for indicators the built-in numeric fallback can't parse
// (src-tauri/src/devices/indicator.rs's `parse_weight`), see the live
// reading once saved. App.tsx's SerialConnectionSync opens/reopens the
// port automatically whenever this saves — "Applied immediately", the
// same shape as the Weighing pane's Stability gate. The full wizard's
// "watch raw bytes live, confirm" steps aren't built: genuinely untestable
// without real hardware in hand, unlike everything else here
// (app/README.md known gap). The mock's own Integrations card lives on
// this same pane (below the serial config, in both branches) — see
// IntegrationsCard above.
export const ConnectionsPane = () => {
    const { settings, unlocked, save } = useSettings();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const serial = isSerialIndicatorSource(indicator) ? indicator : null;
    const [ports, setPorts] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const conn = settings.Connections;

    useEffect(() => {
        if (!serial) return;
        setRefreshing(true);
        void serial
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    }, [serial]);

    if (!serial) {
        return (
            <div className={styles.grid}>
                <Card title={<span className="lbl">Connections</span>}>
                    <p className={styles.hint}>
                        Serial port configuration is only available in the desktop app — this demo
                        (and the GitHub Pages build) has no real hardware to connect to, so the
                        indicator here is always simulated.
                    </p>
                </Card>
                <IntegrationsCard />
                <EmailCard />
                <SmsCard />
                <RemoteAccessCard />
            </div>
        );
    }

    const error = serial.getConnectionError();

    const handleRescan = (): void => {
        setRefreshing(true);
        void serial
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    };

    return (
        <div className={styles.grid}>
            <Card
                title={<span className="lbl">Weight indicator</span>}
                headerRight={<span className={styles.applied}>Applied immediately</span>}
            >
                <div className={styles.body}>
                    <FieldGrid columns={2}>
                        <Field id="connPort" label={{ en: "Serial port" }}>
                            <select
                                id="connPort"
                                value={conn.IndicatorPort}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Connections: {
                                            ...conn,
                                            IndicatorPort: event.target.value,
                                        },
                                    })
                                }
                            >
                                <option value="">Not connected</option>
                                {ports.map((port) => (
                                    <option key={port} value={port}>
                                        {port}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field id="connBaud" label={{ en: "Baud rate" }}>
                            <select
                                id="connBaud"
                                value={conn.IndicatorBaud}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Connections: {
                                            ...conn,
                                            IndicatorBaud: Number(event.target.value),
                                        },
                                    })
                                }
                            >
                                {BAUD_RATE_OPTIONS.map((baud) => (
                                    <option key={baud} value={baud}>
                                        {baud}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </FieldGrid>
                    <Field id="connPattern" label={{ en: "Custom pattern (advanced)" }}>
                        <input
                            id="connPattern"
                            placeholder="Leave blank to auto-extract the number from each line"
                            value={conn.IndicatorPattern}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Connections: { ...conn, IndicatorPattern: event.target.value },
                                })
                            }
                        />
                    </Field>
                    <div className={styles.statusRow}>
                        <button
                            type="button"
                            className={styles.mini}
                            disabled={refreshing}
                            onClick={handleRescan}
                        >
                            {refreshing ? "Scanning…" : "Rescan ports"}
                        </button>
                        {conn.IndicatorPort ? (
                            error ? (
                                <span className={styles.statusBad}>⚠ {error}</span>
                            ) : (
                                <span className={styles.statusOk}>
                                    {reading.Stable ? "Reading" : "Connected"} —{" "}
                                    {formatWeightKg(reading.WeightKg)} kg
                                </span>
                            )
                        ) : (
                            <span className={styles.hint}>No port selected.</span>
                        )}
                    </div>
                    <p className={styles.hint}>
                        The pattern is a regex with one capture group around the weight — for
                        indicators the built-in numeric extraction can&apos;t parse cleanly (a
                        checksum byte or station ID mixed into the same line). Most installations
                        leave this blank.
                    </p>
                </div>
            </Card>
            <IntegrationsCard />
            <EmailCard />
            <SmsCard />
            <RemoteAccessCard />
        </div>
    );
};
