import { useEffect, useState } from "react";

import { AppShell } from "@components/AppShell";
import type { AppShellTab } from "@components/AppShell";
import { ContextualHelp } from "@components/ContextualHelp";
import { WeightDisplay } from "@components/WeightDisplay";
import { createDataPort } from "@db/createDataPort";
import { DataPortProvider } from "@db/DataPortProvider";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import {
    IndicatorProvider,
    isSerialIndicatorSource,
    useIndicatorReading,
} from "@engines/indicator";
import type { IndicatorSource } from "@engines/indicator";
import { createIndicatorSource } from "@engines/indicator/createIndicatorSource";
import { createLicensingSource } from "@engines/licensing/createLicensingSource";
import { createEmailSource } from "@engines/email/createEmailSource";
import { createTunnelSource } from "@engines/tunnel/createTunnelSource";
import { TunnelProvider } from "@engines/tunnel";
import type { TunnelSource } from "@engines/tunnel";
import { createVerificationServerSource } from "@engines/verification/createVerificationServerSource";
import { VerificationServerProvider } from "@engines/verification";
import type { VerificationServerSource } from "@engines/verification";
import { CamerasScreen } from "@features/cameras";
import { DashboardScreen } from "@features/dashboard";
import { LicenseProvider, renderLicenseBanner, useLicense } from "@features/licensing";
import { MastersScreen } from "@features/masters";
import { ReportsScreen } from "@features/reports";
import { buildDailySummaryEmail, nowLocalHm, todayLocalDate } from "@features/reports/dailySummaryEmail";
import {
    AdminChip,
    OperatorChip,
    SettingsProvider,
    SettingsScreen,
    useSettings,
} from "@features/settings";
import { useWeighingTicket, WeighingScreen } from "@features/weighing";
import type { UseWeighingTicket } from "@features/weighing";
import { DEFAULT_HELP_TOPICS } from "@i18n/helpTopics";
import { I18nProvider } from "@i18n/I18nProvider";
import { loadLanguagePacks, saveLanguagePack } from "@i18n/loadLanguagePacks";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

// The day-one seed, saved as a real `config` row on first run (see
// `loadLanguagePacks`'s effect below) rather than a hardcoded prop — proves
// a pack overrides a subset of keys and everything else falls through to
// English (PLAN §8.3). Not real Tamil content (that's authoring work, not
// infrastructure); real packs after this one come from Settings' Fields &
// language pane, same upload path, same shape.
const DEMO_TAMIL_PACK: LanguagePack = {
    Code: "ta",
    Name: "தமிழ்",
    Version: 1,
    Strings: {
        "nav.dash": "முகப்பு",
        "nav.weigh": "நிறுத்தல்",
        tare: "காலி எடை",
        gross: "மொத்த எடை",
        net: "நிகர எடை",
    },
};

const TAB_KEYS = ["dash", "weigh", "cameras", "reports", "masters", "settings"] as const;
const TAB_ICONS: Record<(typeof TAB_KEYS)[number], string> = {
    dash: "▩",
    weigh: "◎",
    cameras: "▣",
    reports: "▦",
    masters: "◈",
    settings: "⚙",
};

interface TopBarActionsProps {
    lang: string;
    /** Name of the first non-English installed pack, or null if none is — "one extra language ships at a time" (I18nProvider's own doc comment), so this stays a toggle, not a picker, even though `packs` can hold more. */
    otherPackName: string | null;
    onToggleLang: () => void;
    helpOpen: boolean;
    onToggleHelp: () => void;
    helpTitle: string;
}

const TopBarActions = ({
    lang,
    otherPackName,
    onToggleLang,
    helpOpen,
    onToggleHelp,
    helpTitle,
}: TopBarActionsProps) => (
    <>
        {otherPackName && (
            <button className="chip act" onClick={onToggleLang}>
                {lang === "en" ? otherPackName : "English"}
            </button>
        )}
        <OperatorChip />
        <AdminChip />
        <button
            className="iconbtn"
            aria-expanded={helpOpen}
            title={helpTitle}
            onClick={onToggleHelp}
        >
            ?
        </button>
    </>
);

interface TabContentProps {
    tab: (typeof TAB_KEYS)[number];
    ticket: UseWeighingTicket;
    onOpenTicket: (doc: DocRow) => void;
    onNavigateToReports: () => void;
    onResetTicketSeries: () => Promise<void>;
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    /** `useLicense().isGated` — the one place licensing actually changes what the operator can do (task #38); see WeighingScreen's own `licenseGated` prop comment. */
    licenseGated: boolean;
}

// The Weighing ticket hook is lifted to Shell (not owned by WeighingScreen
// itself) so Reports and Dashboard can resume a ticket into the same deck
// across a tab switch — see @features/weighing's UseWeighingTicket.
const TabContent = ({
    tab,
    ticket,
    onOpenTicket,
    onNavigateToReports,
    onResetTicketSeries,
    onAddLanguagePack,
    licenseGated,
}: TabContentProps) => {
    switch (tab) {
        case "dash":
            return <DashboardScreen onNavigateToReports={onNavigateToReports} />;
        case "weigh":
            return <WeighingScreen ticket={ticket} licenseGated={licenseGated} />;
        case "reports":
            return <ReportsScreen onOpenTicket={onOpenTicket} />;
        case "masters":
            return <MastersScreen />;
        case "settings":
            return (
                <SettingsScreen
                    onResetTicketSeries={onResetTicketSeries}
                    onAddLanguagePack={onAddLanguagePack}
                />
            );
        case "cameras":
            return <CamerasScreen ticket={ticket} />;
    }
};

interface ShellProps {
    /** Owned at App level — the loaded/live pack list lives above I18nProvider, which is above Shell. */
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
}

const Shell = ({ onAddLanguagePack }: ShellProps) => {
    const { t, lang, setLang, packs } = useTranslation();
    const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("weigh");
    const [helpOpen, setHelpOpen] = useState(false);
    const reading = useIndicatorReading();
    const db = useDataPort();
    const { settings } = useSettings();
    const license = useLicense();
    const ticket = useWeighingTicket(settings.Rules.TareFirst, settings.OperatorName);
    const otherPack = packs.find((pack) => pack.Code !== "en") ?? null;

    const openTicket = (doc: DocRow): void => {
        ticket.resume(doc);
        setActiveTab("weigh");
    };

    const resetTicketSeries = async (): Promise<void> => {
        await db.resetDocSeries("Ticket", "default");
    };

    const tabs: AppShellTab[] = TAB_KEYS.map((key) => ({
        key,
        label: t(`nav.${key}`),
        icon: TAB_ICONS[key],
    }));

    return (
        <AppShell
            siteLabel="Sri Lakshmi Blue Metals · Nagercoil · Bridge 1"
            tabs={tabs}
            activeTab={activeTab}
            onNavigate={(key) => setActiveTab(key as (typeof TAB_KEYS)[number])}
            topRight={
                <TopBarActions
                    lang={lang}
                    otherPackName={otherPack?.Name ?? null}
                    onToggleLang={() =>
                        otherPack && setLang(lang === otherPack.Code ? "en" : otherPack.Code)
                    }
                    helpOpen={helpOpen}
                    onToggleHelp={() => setHelpOpen((v) => !v)}
                    helpTitle={t("nav.help")}
                />
            }
            header={
                <WeightDisplay
                    weightKg={reading.WeightKg}
                    capacityKg={60000}
                    stable={reading.Stable}
                    motion={!reading.Stable}
                    mode={activeTab === "weigh" ? "full" : "compact"}
                    labels={{
                        indicator: t("ind"),
                        stable: t("stable"),
                        motion: t("motion"),
                        unit: t("kg"),
                    }}
                />
            }
            banner={renderLicenseBanner(license.state, license.isGated)}
        >
            <TabContent
                tab={activeTab}
                ticket={ticket}
                onOpenTicket={openTicket}
                onNavigateToReports={() => setActiveTab("reports")}
                onResetTicketSeries={resetTicketSeries}
                onAddLanguagePack={onAddLanguagePack}
                licenseGated={license.isGated}
            />
            <ContextualHelp
                open={helpOpen}
                topic={DEFAULT_HELP_TOPICS[activeTab] ?? null}
                lang={lang}
                onClose={() => setHelpOpen(false)}
                labels={{ title: t("help"), close: "Close help" }}
            />
        </AppShell>
    );
};

interface IndicatorSyncProps {
    indicator: IndicatorSource;
}

// Settings' Weighing pane (Stability gate) writes through to whichever
// indicator is live — the simulated one and the real serial one
// (serialIndicator.ts) both implement `updateOptions` with the same
// shape, "Applied immediately" per the mock's own card header. Nothing
// to do for an adapter that doesn't implement it (none exists today, but
// the interface doesn't require it — see IndicatorSource's own comment),
// so this bridge only exists here, not inside
// IndicatorProvider/useIndicator's generic surface.
const StabilityGateSync = ({ indicator }: IndicatorSyncProps) => {
    const { settings } = useSettings();
    useEffect(() => {
        if (!("updateOptions" in indicator)) return;
        (
            indicator as IndicatorSource & {
                updateOptions: (options: { settleTicks?: number; closeEnoughKg?: number }) => void;
            }
        ).updateOptions({
            settleTicks: settings.Stability.ReadingsInRow,
            closeEnoughKg: settings.Stability.BandKg,
        });
    }, [indicator, settings.Stability.ReadingsInRow, settings.Stability.BandKg]);
    return null;
};

// Settings' Integrations → "QR verification page" toggle (PLAN §18/§23
// item 6), same "Applied immediately" shape as StabilityGateSync/
// SerialConnectionSync above: flip it on and the LAN server starts
// without a restart, flip it off and it stops. The noop source (browser
// demo / memory adapter build) makes both calls harmless no-ops.
const VerificationServerSync = ({ source }: { source: VerificationServerSource }) => {
    const { settings } = useSettings();
    const enabled = settings.Integrations.qr;
    useEffect(() => {
        if (enabled) {
            void source.start();
        } else {
            void source.stop();
        }
    }, [source, enabled]);
    return null;
};

// Settings' Connections pane → Remote access "Turn on/off" toggle (PLAN
// §18's own "Remote access — Cloudflare Tunnel, opt-in, off by default"),
// same "Applied immediately" shape as VerificationServerSync above: flip it
// on and the cloudflared connector starts (if a token is saved — `open`
// reports a clear error otherwise, surfaced next time the pane checks
// status) without a restart, flip it off and it stops. The noop source
// (browser demo / memory adapter build) makes both calls harmless no-ops.
const RemoteAccessSync = ({ source }: { source: TunnelSource }) => {
    const { settings } = useSettings();
    const enabled = settings.RemoteAccess.Enabled;
    useEffect(() => {
        if (enabled) {
            void source.start();
        } else {
            void source.stop();
        }
    }, [source, enabled]);
    return null;
};

// Settings' Connections pane writes through to the real serial adapter the
// same "Applied immediately" way — opens (or reopens, on a config change)
// the configured port on every save, including the very first one after
// app startup, so a desktop relaunch reconnects without the operator
// re-visiting Settings. A blank port disconnects rather than attempting a
// connection. No-op for the simulated adapter (isSerialIndicatorSource is
// false), so this is inert everywhere except a real desktop build.
const SerialConnectionSync = ({ indicator }: IndicatorSyncProps) => {
    const { settings } = useSettings();
    const conn = settings.Connections;
    useEffect(() => {
        if (!isSerialIndicatorSource(indicator)) return;
        if (!conn.IndicatorPort) {
            void indicator.disconnect();
            return;
        }
        void indicator.connect({
            port: conn.IndicatorPort,
            baud: conn.IndicatorBaud,
            pattern: conn.IndicatorPattern,
        });
    }, [indicator, conn.IndicatorPort, conn.IndicatorBaud, conn.IndicatorPattern]);
    return null;
};

// Task #45 — PLAN §18's "scheduled daily summary". Same "Applied
// immediately" shape as the Sync components above, but on a timer instead
// of a settings-change effect: no background worker/service exists in this
// app (app/README.md known gap), so this is the entire scheduler — a
// once-a-minute check, while the app happens to be open, for "has today's
// scheduled time passed, and did today's summary not already go out."
// `DailySummary.LastSentDate` (advanced via `recordDailySummarySent`,
// regardless of send success) is what stops a satisfied check from firing
// again next minute, and what stops a relaunch later the same day from
// re-sending. One attempt, no retry queue — the same honesty as
// `WeighingScreen`'s own per-ticket e-mail/SMS (see its own comments), so a
// misconfigured SMTP relay fails once a day here, not once a minute.
const DailySummarySync = () => {
    const db = useDataPort();
    const { settings, recordDailySummarySent } = useSettings();
    const [email] = useState(() => createEmailSource());
    const cfg = settings.DailySummary;
    const smtp = settings.Smtp;
    const amountDp = settings.Formats.AmountDp;

    useEffect(() => {
        if (!cfg.Enabled) return;
        const checkDue = (): void => {
            const today = todayLocalDate();
            if (cfg.LastSentDate === today) return;
            if (nowLocalHm() < cfg.Time) return;
            const to = cfg.Recipient.trim();
            if (!to) return;
            void (async () => {
                const docs = await db.listDocs({ DocKind: "Ticket" });
                const { subject, body } = buildDailySummaryEmail(docs, today, amountDp);
                const outboxRow = await db.enqueueOutbox({
                    Channel: "Email",
                    Body: { Kind: "DailySummary", Date: today, To: to },
                });
                const result = await email.send({
                    host: smtp.Host,
                    port: smtp.Port,
                    username: smtp.Username,
                    to,
                    subject,
                    body,
                });
                await db.updateOutbox(outboxRow.OutboxId, {
                    State: result.Ok ? "Sent" : "Failed",
                    Attempts: outboxRow.Attempts + 1,
                });
                await recordDailySummarySent(today);
            })();
        };
        checkDue();
        const timer = setInterval(checkDue, 60_000);
        return () => clearInterval(timer);
    }, [
        db,
        email,
        cfg.Enabled,
        cfg.Time,
        cfg.Recipient,
        cfg.LastSentDate,
        smtp,
        amountDp,
        recordDailySummarySent,
    ]);

    return null;
};

export const App = () => {
    const [db] = useState(() => createDataPort());
    const [indicator] = useState(() => createIndicatorSource());
    const [verificationServer] = useState(() => createVerificationServerSource());
    const [tunnel] = useState(() => createTunnelSource());
    const [licensing] = useState(() => createLicensingSource());
    const [packs, setPacks] = useState<LanguagePack[]>([]);

    // Loaded from `config` (ConfigKind: "LanguagePack") — I18nProvider's own
    // doc comment: "loading is the caller's job", this is that job. A fresh
    // install has no rows yet, so the one pack this build ships with is
    // seeded as a real row rather than kept as a hardcoded prop — same
    // "create the default row on first run" shape SettingsProvider already
    // uses for its own config row.
    useEffect(() => {
        let cancelled = false;
        void loadLanguagePacks(db).then(async (loaded) => {
            if (cancelled) return;
            if (loaded.length > 0) {
                setPacks(loaded);
                return;
            }
            await saveLanguagePack(db, DEMO_TAMIL_PACK);
            if (!cancelled) setPacks([DEMO_TAMIL_PACK]);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Settings' Fields & language pane calls this on a successful upload —
    // persists, then updates the live list the same render pass, so the
    // new pack is immediately selectable without a reload.
    const addLanguagePack = async (pack: LanguagePack): Promise<void> => {
        await saveLanguagePack(db, pack);
        setPacks((prev) => [...prev.filter((existing) => existing.Code !== pack.Code), pack]);
    };

    return (
        <I18nProvider packs={packs}>
            <DataPortProvider db={db}>
                <SettingsProvider>
                    <LicenseProvider source={licensing}>
                        <IndicatorProvider source={indicator}>
                            <VerificationServerProvider source={verificationServer}>
                                <TunnelProvider source={tunnel}>
                                    <StabilityGateSync indicator={indicator} />
                                    <SerialConnectionSync indicator={indicator} />
                                    <VerificationServerSync source={verificationServer} />
                                    <RemoteAccessSync source={tunnel} />
                                    <DailySummarySync />
                                    <Shell onAddLanguagePack={addLanguagePack} />
                                </TunnelProvider>
                            </VerificationServerProvider>
                        </IndicatorProvider>
                    </LicenseProvider>
                </SettingsProvider>
            </DataPortProvider>
        </I18nProvider>
    );
};
