import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppShell } from "@components/AppShell";
import type { AppShellTab } from "@components/AppShell";
import { ContextualHelp } from "@components/ContextualHelp";
import { WeightDisplay } from "@components/WeightDisplay";
import { createDataPort } from "@db/createDataPort";
import { DataPortProvider } from "@db/DataPortProvider";
import { loadTicketSchema, saveTicketSchema } from "@db/schema";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { createEmailSource } from "@engines/email/createEmailSource";
import {
    IndicatorProvider,
    isSerialIndicatorSource,
    useIndicatorReading,
} from "@engines/indicator";
import type { IndicatorSource } from "@engines/indicator";
import { createIndicatorSource } from "@engines/indicator/createIndicatorSource";
import { createLicensingSource } from "@engines/licensing/createLicensingSource";
import { reconcileOutboxOutcome } from "@engines/outbox";
import type { SchedulerSource } from "@engines/scheduler";
import { createSchedulerSource } from "@engines/scheduler/createSchedulerSource";
import { DEFAULT_TICKET_SCHEMA, SchemaProvider } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import { TunnelProvider } from "@engines/tunnel";
import type { TunnelSource } from "@engines/tunnel";
import { createTunnelSource } from "@engines/tunnel/createTunnelSource";
import { VerificationServerProvider } from "@engines/verification";
import type { VerificationServerSource } from "@engines/verification";
import { createVerificationServerSource } from "@engines/verification/createVerificationServerSource";
import { createWindowPinSource } from "@engines/windowPin/createWindowPinSource";
import type { WindowPinSource } from "@engines/windowPin/types";
import { CamerasScreen } from "@features/cameras";
import { DashboardScreen } from "@features/dashboard";
import { LicenseProvider, renderLicenseBanner, useLicense } from "@features/licensing";
import { MastersScreen } from "@features/masters";
import { ReportsScreen } from "@features/reports";
import {
    buildDailySummaryEmail,
    isMoreThanOneDayLate,
    nowLocalHm,
    todayLocalDate,
} from "@features/reports/dailySummaryEmail";
import { OperatorChip, SettingsProvider, SettingsScreen, useOutboxWorker, useSettings } from "@features/settings";
import type { BusinessInfo } from "@features/settings";
import { setTicketNumberDraftLabel, useWeighingTicket, WeighingScreen } from "@features/weighing";
import type { UseWeighingTicket } from "@features/weighing";
import { DEFAULT_HELP_TOPICS } from "@i18n/helpTopics";
import { I18nProvider } from "@i18n/I18nProvider";
import { loadLanguagePacks, mergeLanguagePacks, saveLanguagePack } from "@i18n/loadLanguagePacks";
import { BUILT_IN_PACKS } from "@i18n/packs";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

const TAB_KEYS = ["dash", "weigh", "cameras", "reports", "masters", "settings"] as const;

// The 5 primary tabs AppShell shows in its nav row (task #62) — Settings
// moved to the secondary top-bar controls (TopBarActions below), reached by
// its own icon button next to Language/Operator/Help, same "not a
// screen-switching tab" treatment as those already had.
const PRIMARY_TAB_KEYS = TAB_KEYS.filter((key) => key !== "settings");

// Dashboard/Weighing/Cameras all get the same bigger indicator readout — the
// other tabs (Reports/Masters/Settings) keep the compact one (PLAN §21).
const BIG_HEADER_TABS = new Set<(typeof TAB_KEYS)[number]>(["dash", "weigh", "cameras"]);

// Was a hardcoded string in AppShell's `siteLabel` prop — now editable via
// Settings' Business pane (PLAN §21); `·`-joins only the parts the operator
// actually filled in, so a blank Address/Phone doesn't leave dangling " · "s.
const buildSiteLabel = (business: BusinessInfo): string =>
    [business.Name, business.Address, business.Phone].filter(Boolean).join(" · ");
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
    settingsTitle: string;
    onOpenSettings: () => void;
}

const TopBarActions = ({
    lang,
    otherPackName,
    onToggleLang,
    helpOpen,
    onToggleHelp,
    helpTitle,
    settingsTitle,
    onOpenSettings,
}: TopBarActionsProps) => (
    <>
        {otherPackName && (
            <button className="chip act" onClick={onToggleLang}>
                {lang === "en" ? otherPackName : "English"}
            </button>
        )}
        <OperatorChip />
        <button className="iconbtn" title={settingsTitle} onClick={onOpenSettings}>
            ⚙
        </button>
        <button
            className="iconbtn"
            aria-expanded={helpOpen}
            title={helpTitle}
            data-help-toggle
            onClick={onToggleHelp}
        >
            ?
        </button>
    </>
);

// Filled while pinned, outline-only while not (task #62's "outline/filled
// state to indicate on/off") — a plain glyph can't do that, so a tiny inline
// SVG the same size as `.iconbtn`'s own icons, same spirit as BrandMark.
const PinIcon = ({ pinned }: { pinned: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M12 2a5 5 0 0 0-5 5c0 3 2 5.5 4 8.2V22h2v-6.8c2-2.7 4-5.2 4-8.2a5 5 0 0 0-5-5Z"
            fill={pinned ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
        />
    </svg>
);

interface PinToggleProps {
    pinned: boolean;
    onToggle: () => void;
    labelOn: string;
    labelOff: string;
}

// The always-on-top toggle (task #62) — always visible in the top bar
// (AppShell's `pin` slot, never collapsed into TopBarOverflow's menu),
// defaults to on (`alwaysOnTop: true`, tauri.conf.json) and is pure
// per-session React state: nothing here writes to Settings/DB, so a
// relaunch always comes back to the config's own default, exactly as the
// "temporary" ask wants.
const PinToggle = ({ pinned, onToggle, labelOn, labelOff }: PinToggleProps) => (
    <button
        className="iconbtn"
        aria-pressed={pinned}
        title={pinned ? labelOn : labelOff}
        onClick={onToggle}
    >
        <PinIcon pinned={pinned} />
    </button>
);

interface TabContentProps {
    tab: (typeof TAB_KEYS)[number];
    ticket: UseWeighingTicket;
    onOpenTicket: (doc: DocRow) => void;
    onNavigateToReports: () => void;
    onNavigateToCameras: () => void;
    onResetTicketSeries: () => Promise<void>;
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    /** `useLicense().isGated` — the one place licensing actually changes what the operator can do (task #38); see WeighingScreen's own `licenseGated` prop comment. */
    licenseGated: boolean;
    /** See ReportsScreen's own `reportsIntent` prop comment (PLAN §21 bug fix). */
    reportsIntent: { kind: "waiting"; nonce: number } | null;
}

// The Weighing ticket hook is lifted to Shell (not owned by WeighingScreen
// itself) so Reports and Dashboard can resume a ticket into the same deck
// across a tab switch — see @features/weighing's UseWeighingTicket.
const TabContent = ({
    tab,
    ticket,
    onOpenTicket,
    onNavigateToReports,
    onNavigateToCameras,
    onResetTicketSeries,
    onAddLanguagePack,
    licenseGated,
    reportsIntent,
}: TabContentProps) => {
    switch (tab) {
        case "dash":
            return <DashboardScreen onNavigateToReports={onNavigateToReports} />;
        case "weigh":
            return (
                <WeighingScreen
                    ticket={ticket}
                    licenseGated={licenseGated}
                    onNavigateToCameras={onNavigateToCameras}
                />
            );
        case "reports":
            return <ReportsScreen onOpenTicket={onOpenTicket} reportsIntent={reportsIntent} />;
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

// The mock's own weight readout — full-size on Dashboard/Weighing/Cameras
// (the three tabs where knowing the live reading actually matters —
// PLAN §21), compact as a glance-only strip on Masters/Reports/Settings
// (AppShell's `header` slot). Pulled out of Shell so its own prop wiring
// doesn't count against Shell's budget.
const ShellWeightHeader = ({
    reading,
    compact,
    t,
    lang,
}: {
    reading: ReturnType<typeof useIndicatorReading>;
    compact: boolean;
    t: ReturnType<typeof useTranslation>["t"];
    lang: ReturnType<typeof useTranslation>["lang"];
}) => (
    <WeightDisplay
        weightKg={reading.WeightKg}
        capacityKg={60000}
        stable={reading.Stable}
        motion={!reading.Stable}
        mode={compact ? "compact" : "full"}
        lang={lang}
        labels={{
            indicator: t("ind"),
            stable: t("stable"),
            motion: t("motion"),
            unit: t("kg"),
        }}
    />
);

const buildNavTabs = (t: ReturnType<typeof useTranslation>["t"]): AppShellTab[] =>
    PRIMARY_TAB_KEYS.map((key) => ({ key, label: t(`nav.${key}`), icon: TAB_ICONS[key] }));

// Per-session only (task #62) — a relaunch always comes back to
// `tauri.conf.json`'s own `alwaysOnTop: true`, same as the config itself,
// since this is just React state with nothing behind it that persists.
const usePinToggle = (windowPin: WindowPinSource) => {
    const [pinned, setPinned] = useState(true);
    useEffect(() => {
        void windowPin.setAlwaysOnTop(pinned);
    }, [windowPin, pinned]);
    return { pinned, onToggle: () => setPinned((value) => !value) };
};

// The two handlers TabContent needs that reach outside its own props (resume
// a ticket from Reports by switching tabs; reset the doc series from
// Settings) — pulled out of Shell's body so Shell itself stays under the
// line budget.
const useShellTicketActions = (
    ticket: UseWeighingTicket,
    db: ReturnType<typeof useDataPort>,
    setActiveTab: (tab: (typeof TAB_KEYS)[number]) => void,
) => {
    const openTicket = (doc: DocRow): void => {
        ticket.resume(doc);
        setActiveTab("weigh");
    };

    const resetTicketSeries = async (): Promise<void> => {
        await db.resetDocSeries("Ticket", "default");
    };
    return { openTicket, resetTicketSeries };
};

// Dashboard's "waiting" KPI tile switching tabs without telling Reports
// which filter the operator wanted (PLAN §21 bug report) — see
// ReportsScreen's own `reportsIntent` prop comment. Split out for the same
// line-budget reason as useShellTicketActions above.
const useReportsNavigation = (setActiveTab: (tab: (typeof TAB_KEYS)[number]) => void) => {
    const [reportsIntent, setReportsIntent] = useState<{ kind: "waiting"; nonce: number } | null>(null);
    const onNavigateToReports = (): void => {
        setActiveTab("reports");
        setReportsIntent((prev) => ({ kind: "waiting", nonce: (prev?.nonce ?? 0) + 1 }));
    };

    return { reportsIntent, onNavigateToReports };
};

// Bug fix: formatTicketNo's "Draft" placeholder was a bare English literal
// (ticketNumber.ts has no React context of its own — same reasoning as
// setTicketNumberFormat's push-on-change) — push the translated string down
// on every language change. Split out for the same line-budget reason as
// the two hooks above.
const useDraftLabelSync = (t: ReturnType<typeof useTranslation>["t"]): void => {
    useEffect(() => {
        setTicketNumberDraftLabel(t("weigh.draft"));
    }, [t]);
};

interface ShellProps {
    /** Owned at App level — the loaded/live pack list lives above I18nProvider, which is above Shell. */
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    /** Owned at App level, same "one instance per app, not per Shell render" shape as every other `@engines/*` source below. */
    windowPin: WindowPinSource;
}

interface UseShellTopBarArgs {
    windowPin: WindowPinSource;
    lang: string;
    setLang: (lang: string) => void;
    otherPack: LanguagePack | null;
    helpOpen: boolean;
    setHelpOpen: (updater: (value: boolean) => boolean) => void;
    onOpenSettings: () => void;
}

// AppShell's `pin` + `topRight` slots (the always-on-top toggle and the
// Settings/Language/Operator/Help controls) — split out of Shell purely to
// keep that component under the file's own line budget.
const useShellTopBar = ({
    windowPin,
    lang,
    setLang,
    otherPack,
    helpOpen,
    setHelpOpen,
    onOpenSettings,
}: UseShellTopBarArgs) => {
    const { t } = useTranslation();
    const { pinned, onToggle } = usePinToggle(windowPin);
    const pin = (
        <PinToggle
            pinned={pinned}
            onToggle={onToggle}
            labelOn={t("components.appShell.pinOn")}
            labelOff={t("components.appShell.pinOff")}
        />
    );
    const topRight = (
        <TopBarActions
            lang={lang}
            otherPackName={otherPack?.Name ?? null}
            onToggleLang={() => otherPack && setLang(lang === otherPack.Code ? "en" : otherPack.Code)}
            helpOpen={helpOpen}
            onToggleHelp={() => setHelpOpen((v) => !v)}
            helpTitle={t("nav.help")}
            settingsTitle={t("nav.settings")}
            onOpenSettings={onOpenSettings}
        />
    );
    return { pin, topRight };
};

const Shell = ({ onAddLanguagePack, windowPin }: ShellProps) => {
    const { t, lang, setLang, packs } = useTranslation();
    const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("weigh");
    const [helpOpen, setHelpOpen] = useState(false);
    const reading = useIndicatorReading();
    const db = useDataPort();
    const { settings, loading: settingsLoading } = useSettings();
    const license = useLicense();
    useRemoveInitialSplash(!settingsLoading);
    const ticket = useWeighingTicket(
        settings.Rules.TareFirst,
        settings.OperatorName,
        settings.Rules.MultiGross,
    );
    const otherPack = packs.find((pack) => pack.Code !== "en") ?? null;
    const { openTicket, resetTicketSeries } = useShellTicketActions(ticket, db, setActiveTab);
    const { reportsIntent, onNavigateToReports } = useReportsNavigation(setActiveTab);
    useDraftLabelSync(t);
    const { pin, topRight } = useShellTopBar({
        windowPin,
        lang,
        setLang,
        otherPack,
        helpOpen,
        setHelpOpen,
        onOpenSettings: () => setActiveTab("settings"),
    });

    return (
        <AppShell
            siteLabel={buildSiteLabel(settings.Business)}
            tabs={buildNavTabs(t)}
            activeTab={activeTab}
            onNavigate={(key) => setActiveTab(key as (typeof TAB_KEYS)[number])}
            pin={pin}
            topRight={topRight}
            header={<ShellWeightHeader reading={reading} compact={!BIG_HEADER_TABS.has(activeTab)} t={t} lang={lang} />}
            banner={renderLicenseBanner(license.state, license.isGated)}
        >
            <TabContent
                tab={activeTab}
                ticket={ticket}
                onOpenTicket={openTicket}
                onNavigateToReports={onNavigateToReports}
                onNavigateToCameras={() => setActiveTab("cameras")}
                onResetTicketSeries={resetTicketSeries}
                onAddLanguagePack={onAddLanguagePack}
                licenseGated={license.isGated}
                reportsIntent={reportsIntent}
            />
            <ContextualHelp
                open={helpOpen}
                topic={DEFAULT_HELP_TOPICS[activeTab] ?? null}
                lang={lang}
                onClose={() => setHelpOpen(false)}
                labels={{ title: t("help"), close: t("components.contextualHelp.close") }}
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
// of a settings-change effect — a once-a-minute check, while the app
// happens to be open, for "has today's scheduled time passed, and did
// today's summary not already go out." `DailySummary.LastSentDate`
// (advanced via `recordDailySummarySent`, regardless of send success) is
// what stops a satisfied check from firing again next minute, and what
// stops a relaunch later the same day from re-sending. One attempt from
// here, same as `WeighingScreen`'s own per-ticket e-mail/SMS (see its own
// comments) — but unlike before the outbox-worker task, a failure here
// isn't a dead end: `reconcileOutboxOutcome` (outboxBackoff.ts) gives the
// row a backoff `NextTryAt`, and `useOutboxWorker.ts` is what actually
// retries it, so a misconfigured SMTP relay gets a few more automatic
// tries over the following hour, not just once a day.
//
// `isMoreThanOneDayLate` (dailySummaryEmail.ts) covers the machine-asleep
// case: a site whose hours never straddle `cfg.Time` would otherwise never
// send at all this way, since nothing here runs while the app is closed —
// it shortens "never" to "late." The real fix is `DailySummaryTaskSync`/
// `HeadlessDailySummarySync` below, which register a genuine Windows Task
// Scheduler wake (`@engines/scheduler`, `src-tauri/src/commands/scheduler.rs`)
// — PLAN §21's "true OS-level scheduler" gap. This per-minute check stays
// as the belt to that OS-level suspenders': it still catches the case a
// site never lets the OS task register at all (disabled, non-Windows dev
// build) or the one time the machine happens to be already open and idle
// right as `cfg.Time` ticks over.
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
            // Normally wait for the scheduled time of day — but once a
            // whole day's been skipped outright (see isMoreThanOneDayLate's
            // own comment), catch up on this launch instead of waiting for
            // the clock to hit `cfg.Time` again, which it may never do.
            if (nowLocalHm() < cfg.Time && !isMoreThanOneDayLate(cfg.LastSentDate, today)) return;
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
                await db.updateOutbox(
                    outboxRow.OutboxId,
                    reconcileOutboxOutcome(result, outboxRow.Attempts),
                );
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

// PLAN §21's "true OS-level scheduler" — registers (or removes) the Windows
// Task Scheduler entry that launches this app with `--daily-summary` at
// `cfg.Time` every day, so the send happens even if the app is closed at
// that moment (`@engines/scheduler`, `src-tauri/src/commands/scheduler.rs`).
// One `sync` call per Enabled/Time change, same "applied immediately"
// shape as every other Settings side effect in this file — `loading` guards
// the very first render so a fresh install's `SYNC_DEFAULT_BODY` (Enabled:
// false) doesn't race a real row that turns out to have Enabled: true.
const DailySummaryTaskSync = ({ scheduler }: { scheduler: SchedulerSource }) => {
    const { settings, loading } = useSettings();
    const cfg = settings.DailySummary;

    useEffect(() => {
        if (loading) return;
        void scheduler.syncDailySummaryTask(cfg.Enabled, cfg.Time);
    }, [scheduler, loading, cfg.Enabled, cfg.Time]);

    return null;
};

// The other half of the OS-level scheduler: what actually runs once
// Windows launches this process with `--daily-summary`. `lib.rs`'s `setup`
// already hid the window before the webview loaded, so nothing here ever
// paints — this sends today's summary unconditionally once `settings` has
// actually loaded (no `nowLocalHm()`/`LastSentDate` gate the way
// `DailySummarySync`'s own per-minute check needs one — the OS already
// picked the right moment to launch this process), then exits. Deliberately
// its own small duplicate of `DailySummarySync`'s send logic rather than a
// shared helper — same "one attempt, not a shared abstraction" precedent
// that component's own header comment already sets for this file.
const HeadlessDailySummarySync = ({ scheduler }: { scheduler: SchedulerSource }) => {
    const db = useDataPort();
    const { settings, loading, recordDailySummarySent } = useSettings();
    const [email] = useState(() => createEmailSource());
    const cfg = settings.DailySummary;
    const smtp = settings.Smtp;
    const amountDp = settings.Formats.AmountDp;
    // `recordDailySummarySent` persisting mid-send re-renders this
    // component, which would otherwise re-run the effect and fire a second
    // send before `exit_app`'s IPC round-trip actually kills the process —
    // this ref makes the one-shot intent (headless launch → one attempt →
    // exit) hold regardless of how many times React re-runs the effect.
    const hasRunRef = useRef(false);

    useEffect(() => {
        if (loading || hasRunRef.current) return;
        hasRunRef.current = true;
        void (async () => {
            const headless = await scheduler.isHeadlessDailySummary();
            if (!headless) return;
            const to = cfg.Recipient.trim();
            if (cfg.Enabled && to) {
                const today = todayLocalDate();
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
                await db.updateOutbox(
                    outboxRow.OutboxId,
                    reconcileOutboxOutcome(result, outboxRow.Attempts),
                );
                await recordDailySummarySent(today);
            }
            await scheduler.exitApp();
        })();
    }, [db, email, scheduler, loading, cfg.Enabled, cfg.Recipient, smtp, amountDp, recordDailySummarySent]);

    return null;
};

// Outbox-worker task — the real background worker app/README.md's own
// "known gap" flagged: everything useOutboxWorker itself does (30s poll,
// Pending + due-Failed rows, Email/Sms/Webhook/Tally/Board) lives in
// @features/settings's own file; this is just where it's switched on, same
// "one Sync component per always-on background concern" shape as
// DailySummarySync/StabilityGateSync/SerialConnectionSync above.
const OutboxWorkerSync = () => {
    useOutboxWorker();
    return null;
};

// `BUILT_IN_PACKS` (src/i18n/packs/) ship this app's own baseline
// translation in source — always present, no database row required. What's
// loaded from `config` (ConfigKind: "LanguagePack") is only ever a site's
// own upload: a genuinely new language, or an override of a built-in one
// (Settings → Fields & language pane) — `mergeLanguagePacks` layers the two,
// key by key, uploaded winning (`loadLanguagePacks.ts`).
const useAppLanguagePacks = (db: ReturnType<typeof useDataPort>) => {
    const [uploaded, setUploaded] = useState<LanguagePack[]>([]);

    useEffect(() => {
        let cancelled = false;
        void loadLanguagePacks(db).then((loaded) => {
            if (!cancelled) setUploaded(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Settings' Fields & language pane calls this on a successful upload —
    // persists, then updates the live list the same render pass, so the new
    // pack is immediately selectable without a reload.
    const addLanguagePack = async (pack: LanguagePack): Promise<void> => {
        await saveLanguagePack(db, pack);
        setUploaded((prev) => [...prev.filter((existing) => existing.Code !== pack.Code), pack]);
    };

    return { packs: mergeLanguagePacks(BUILT_IN_PACKS, uploaded), addLanguagePack };
};

// Loaded from `config` (ConfigKind: "Schema") — same "caller loads, provider
// just wires it up" split as useAppLanguagePacks above. A fresh install has
// no row yet, so `loadTicketSchema` itself falls back to
// `DEFAULT_TICKET_SCHEMA` (db/schema.ts) rather than seeding a row here; the
// schema only gets persisted once a site actually saves its own.
const useAppTicketSchema = (db: ReturnType<typeof useDataPort>) => {
    const [ticketSchema, setTicketSchemaState] = useState<Schema>(DEFAULT_TICKET_SCHEMA);

    useEffect(() => {
        let cancelled = false;
        void loadTicketSchema(db).then((loaded) => {
            if (!cancelled) setTicketSchemaState(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Passed to SchemaProvider as `onSetTicketSchema` — reachable from
    // anywhere in the tree via `useSchema()`, so unlike `addLanguagePack`
    // this isn't threaded down as a prop.
    const setTicketSchema = async (schema: Schema): Promise<void> => {
        await saveTicketSchema(db, schema);
        setTicketSchemaState(schema);
    };

    return { ticketSchema, setTicketSchema };
};

// index.html's #app-splash covers the gap before Settings (the last thing
// Shell needs before its first real paint — everything else in App's
// provider stack renders unconditionally with a sane default) finishes its
// first load. `useLayoutEffect` fires just before the browser paints the
// real shell underneath, then the splash fades itself out on top of it
// (base.css's `.app-splash-out` transition) rather than vanishing instantly
// — an instant `.remove()` read as a glitch, not the end of a load.
const useRemoveInitialSplash = (ready: boolean): void => {
    useLayoutEffect(() => {
        if (!ready) return;
        const splash = document.getElementById("app-splash");
        if (!splash) return;
        splash.classList.add("app-splash-out");
        const remove = () => splash.remove();
        splash.addEventListener("transitionend", remove, { once: true });
        // Belt-and-suspenders: `prefers-reduced-motion` sets `transition:
        // none` in CSS, which never fires `transitionend` at all — without
        // this fallback the splash would sit fully transparent but still
        // blocking clicks (it's `position: fixed; inset: 0`) forever.
        const fallback = window.setTimeout(remove, 300);
        return () => window.clearTimeout(fallback);
    }, [ready]);
};

export const App = () => {
    const [db] = useState(() => createDataPort());
    const [indicator] = useState(() => createIndicatorSource());
    const [verificationServer] = useState(() => createVerificationServerSource());
    const [tunnel] = useState(() => createTunnelSource());
    const [licensing] = useState(() => createLicensingSource());
    const [scheduler] = useState(() => createSchedulerSource());
    const [windowPin] = useState(() => createWindowPinSource());
    const { packs, addLanguagePack } = useAppLanguagePacks(db);
    const { ticketSchema, setTicketSchema } = useAppTicketSchema(db);

    return (
        <I18nProvider packs={packs}>
            <DataPortProvider db={db}>
                <SettingsProvider>
                    <LicenseProvider source={licensing}>
                        <IndicatorProvider source={indicator}>
                            <VerificationServerProvider source={verificationServer}>
                                <TunnelProvider source={tunnel}>
                                    <SchemaProvider ticketSchema={ticketSchema} onSetTicketSchema={setTicketSchema}>
                                        <StabilityGateSync indicator={indicator} />
                                        <SerialConnectionSync indicator={indicator} />
                                        <VerificationServerSync source={verificationServer} />
                                        <RemoteAccessSync source={tunnel} />
                                        <DailySummarySync />
                                        <DailySummaryTaskSync scheduler={scheduler} />
                                        <HeadlessDailySummarySync scheduler={scheduler} />
                                        <OutboxWorkerSync />
                                        <Shell onAddLanguagePack={addLanguagePack} windowPin={windowPin} />
                                    </SchemaProvider>
                                </TunnelProvider>
                            </VerificationServerProvider>
                        </IndicatorProvider>
                    </LicenseProvider>
                </SettingsProvider>
            </DataPortProvider>
        </I18nProvider>
    );
};
