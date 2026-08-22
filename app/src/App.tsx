import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppShell } from "@components/AppShell";
import type { AppShellTab } from "@components/AppShell";
import { ContextualHelp } from "@components/ContextualHelp";
import { CustomCursor } from "@components/CustomCursor";
import { ToastProvider } from "@components/Toast";
import { Tooltip } from "@components/Tooltip";
import { WeightDisplay } from "@components/WeightDisplay";
import type { DateFmt, WeightUnit } from "@constants/numberFormat";
import { createDataPort } from "@db/createDataPort";
import { DataPortProvider } from "@db/DataPortProvider";
import { listTicketSchemas, loadTicketSchema, saveTicketSchema, setActiveTicketSchemaId } from "@db/schema";
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
import { CAMERA_FEATURE_ENABLED, CamerasScreen } from "@features/cameras";
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

// The 5 primary tabs AppShell shows in its nav row — Settings
// moved to the secondary top-bar controls (TopBarActions below), reached by
// its own icon button next to Language/Operator/Help, same "not a
// screen-switching tab" treatment as those already had.
const PRIMARY_TAB_KEYS = TAB_KEYS.filter(
    (key) => key !== "settings" && (key !== "cameras" || CAMERA_FEATURE_ENABLED),
);

// Dashboard/Weighing/Cameras all get the same bigger indicator readout — the
// other tabs (Reports/Masters/Settings) keep the compact one.
const BIG_HEADER_TABS = new Set<(typeof TAB_KEYS)[number]>(["dash", "weigh", "cameras"]);

// Was a hardcoded string in AppShell's `siteLabel` prop — now editable via
// Settings' Business pane; `·`-joins only the parts the operator
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
    /** Rendered as its own button directly before Close (next to
        Close, not off on its own at the far left of the row) — passed in as
        a ready element rather than pinned/onToggle props since App.tsx's
        `PinToggle` already owns its own icon/label wiring. */
    pin: ReactNode;
    minimizeTitle: string;
    onMinimize: () => void;
    closeTitle: string;
    onClose: () => void;
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
    pin,
    minimizeTitle,
    onMinimize,
    closeTitle,
    onClose,
}: TopBarActionsProps) => (
    <>
        {otherPackName && (
            <button className="chip act" onClick={onToggleLang}>
                {lang === "en" ? otherPackName : "English"}
            </button>
        )}
        <OperatorChip />
        <Tooltip label={settingsTitle}>
            <button className="iconbtn" onClick={onOpenSettings}>
                ⚙
            </button>
        </Tooltip>
        <Tooltip label={helpTitle}>
            <button
                className="iconbtn"
                aria-expanded={helpOpen}
                data-help-toggle
                onClick={onToggleHelp}
            >
                ?
            </button>
        </Tooltip>
        {/* Set off from Help with its own margin rather than sitting flush
            against it — the pin toggle and Close are a pair, so the gap
            belongs before the pin, not between the pin and Close. */}
        <span style={{ marginLeft: 10 }}>{pin}</span>
        {/* The window's native title bar is gone (`decorations: false`,
            tauri.conf.json) — Minimize/Close here are the only controls
            left for either. */}
        <Tooltip label={minimizeTitle} align="end">
            <button className="iconbtn" onClick={onMinimize}>
                ─
            </button>
        </Tooltip>
        <Tooltip label={closeTitle} align="end">
            <button className="iconbtn" onClick={onClose}>
                ✕
            </button>
        </Tooltip>
    </>
);

// Filled while pinned, outline-only while not — an outline/filled state
// to indicate on/off, which a plain glyph can't do, so a tiny inline
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

// The always-on-top toggle — always visible in the top bar
// (AppShell's `pin` slot, never collapsed into TopBarOverflow's menu),
// defaults to on (`alwaysOnTop: true`, tauri.conf.json) and is pure
// per-session React state: nothing here writes to Settings/DB, so a
// relaunch always comes back to the config's own default, exactly as the
// "temporary" ask wants.
const PinToggle = ({ pinned, onToggle, labelOn, labelOff }: PinToggleProps) => (
    <Tooltip label={pinned ? labelOn : labelOff}>
        <button
            className="iconbtn"
            aria-pressed={pinned}
            onClick={onToggle}
        >
            <PinIcon pinned={pinned} />
        </button>
    </Tooltip>
);

interface TabContentProps {
    tab: (typeof TAB_KEYS)[number];
    ticket: UseWeighingTicket;
    onOpenTicket: (doc: DocRow) => void;
    onNavigateToReports: () => void;
    onNavigateToCameras: () => void;
    onResetTicketSeries: (startSeq: number) => Promise<{ Epoch: number }>;
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    /** `useLicense().isGated` — the one place licensing actually changes what the operator can do; see WeighingScreen's own `licenseGated` prop comment. */
    licenseGated: boolean;
    /** See ReportsScreen's own `reportsIntent` prop comment. */
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
            // Flag off: fall through to Weighing rather than rendering a
            // screen the nav no longer links to (belt-and-braces against a
            // stale `activeTab` from a prior session/deep link).
            if (!CAMERA_FEATURE_ENABLED) {
                return (
                    <WeighingScreen
                        ticket={ticket}
                        licenseGated={licenseGated}
                        onNavigateToCameras={onNavigateToCameras}
                    />
                );
            }
            return <CamerasScreen ticket={ticket} />;
    }
};

// The mock's own weight readout — full-size on Dashboard/Weighing/Cameras
// (the three tabs where knowing the live reading actually matters),
// compact as a glance-only strip on Masters/Reports/Settings
// (AppShell's `header` slot). Pulled out of Shell so its own prop wiring
// doesn't count against Shell's budget.
const ShellWeightHeader = ({
    reading,
    compact,
    t,
    lang,
    timeFmt,
    dateFmt,
    weightUnit,
}: {
    reading: ReturnType<typeof useIndicatorReading>;
    compact: boolean;
    t: ReturnType<typeof useTranslation>["t"];
    lang: ReturnType<typeof useTranslation>["lang"];
    timeFmt: "24" | "12";
    dateFmt: DateFmt;
    weightUnit: WeightUnit;
}) => (
    <WeightDisplay
        weightKg={reading.WeightKg}
        capacityKg={60000}
        stable={reading.Stable}
        motion={!reading.Stable}
        mode={compact ? "compact" : "full"}
        lang={lang}
        timeFmt={timeFmt}
        dateFmt={dateFmt}
        weightUnit={weightUnit}
        labels={{
            indicator: t("ind"),
            stable: t("stable"),
            motion: t("motion"),
            unit: weightUnit === "t" ? "t" : t("kg"),
        }}
    />
);

const buildNavTabs = (t: ReturnType<typeof useTranslation>["t"]): AppShellTab[] =>
    PRIMARY_TAB_KEYS.map((key) => ({ key, label: t(`nav.${key}`), icon: TAB_ICONS[key] }));

// Per-session only — nothing here persists, so every relaunch comes back to
// this same default regardless of how the pin was left last time.
//
// The window itself opens small and unpinned — tauri.conf.json's own
// `alwaysOnTop: false` — but src/splashWindowControls.ts already pins and
// fills the screen the moment the loading screen paints, well before this
// ever mounts (see that module's own comment on why it's done there and
// not here). `pinned: true` below just reflects that already-applied
// state; `justMounted` skips this effect calling `setAlwaysOnTop`/
// `fillScreen` again on its first run so App.tsx mounting doesn't redo
// work the splash already did — only a later, real toggle click fires
// them. Turning the pin back on re-pins and re-fills; turning it off drops
// always-on-top AND restores the window (task: "when unpining the taskbar
// flashes and goes behind" — a borderless, full-monitor window left up
// with no always-on-top fights the taskbar's own z-order, since
// fillScreen's bounds cover the area the taskbar sits in). Restoring on
// unpin, not just dropping always-on-top, is what actually fixes that.
const usePinToggle = (windowPin: WindowPinSource) => {
    const [pinned, setPinned] = useState(true);
    const justMounted = useRef(true);
    useEffect(() => {
        if (justMounted.current) {
            justMounted.current = false;
            return;
        }
        void windowPin.setAlwaysOnTop(pinned);
        if (pinned) void windowPin.fillScreen();
        else void windowPin.restoreWindow();
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

    const resetTicketSeries = async (startSeq: number): Promise<{ Epoch: number }> => {
        return await db.resetDocSeries("Ticket", "default", startSeq);
    };
    return { openTicket, resetTicketSeries };
};

// Dashboard's "waiting" KPI tile switching tabs without telling Reports
// which filter the operator wanted — see
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

// Bug fix: formatTicketNo's "Draft" placeholder wasn't updating until a
// refresh — pushing it via `useEffect` ran too late (after children already
// rendered with the old label). Called directly in Shell's render body
// instead, so it's current before any child reads it.
const useDraftLabelSync = (t: ReturnType<typeof useTranslation>["t"]): void => {
    setTicketNumberDraftLabel(t("weigh.draft"));
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
    // Rendered inline as part of `topRight` now, directly before Close —
    // pin next to close, not off on its own at the row's left edge —
    // AppShell's separate always-visible `pin` slot is no longer used for
    // this.
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
            pin={pin}
            minimizeTitle={t("nav.minimize")}
            onMinimize={() => void windowPin.minimize()}
            closeTitle={t("nav.close")}
            onClose={() => void windowPin.close()}
        />
    );
    return { topRight };
};

// Split out of Shell purely to stay under CodingStandards' 60-line function
// budget — Shell's hooks alone already fill most of that, so the JSX it
// used to return directly is now this sibling, taking exactly what it needs
// rather than re-deriving anything.
interface ShellBodyProps {
    settings: ReturnType<typeof useSettings>["settings"];
    activeTab: (typeof TAB_KEYS)[number];
    setActiveTab: (tab: (typeof TAB_KEYS)[number]) => void;
    topRight: ReactNode;
    reading: ReturnType<typeof useIndicatorReading>;
    lang: string;
    t: ReturnType<typeof useTranslation>["t"];
    license: ReturnType<typeof useLicense>;
    ticket: UseWeighingTicket;
    openTicket: ReturnType<typeof useShellTicketActions>["openTicket"];
    onNavigateToReports: () => void;
    resetTicketSeries: ReturnType<typeof useShellTicketActions>["resetTicketSeries"];
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    reportsIntent: ReturnType<typeof useReportsNavigation>["reportsIntent"];
    helpOpen: boolean;
    setHelpOpen: (open: boolean) => void;
}

const ShellBody = (props: ShellBodyProps) => {
    const {
        settings, activeTab, setActiveTab, topRight, reading, lang, t, license,
        ticket, openTicket, onNavigateToReports, resetTicketSeries,
        onAddLanguagePack, reportsIntent, helpOpen, setHelpOpen,
    } = props;
    return (
        <AppShell
            siteLabel={buildSiteLabel(settings.Business)}
            tabs={buildNavTabs(t)}
            activeTab={activeTab}
            onNavigate={(key) => setActiveTab(key as (typeof TAB_KEYS)[number])}
            topRight={topRight}
            header={
                <ShellWeightHeader
                    reading={reading}
                    compact={!BIG_HEADER_TABS.has(activeTab)}
                    t={t}
                    lang={lang}
                    timeFmt={settings.Formats.TimeFmt}
                    dateFmt={settings.Formats.DateFmt}
                    weightUnit={settings.Formats.WeightUnit}
                />
            }
            banner={renderLicenseBanner(license.state, license.isGated)}
        >
            <TabContent
                tab={activeTab}
                ticket={ticket}
                onOpenTicket={openTicket}
                onNavigateToReports={onNavigateToReports}
                onNavigateToCameras={() => {
                    if (CAMERA_FEATURE_ENABLED) setActiveTab("cameras");
                }}
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

const Shell = ({ onAddLanguagePack, windowPin }: ShellProps) => {
    const { t, lang, setLang, packs } = useTranslation();
    const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("weigh");
    const [helpOpen, setHelpOpen] = useState(false);
    const reading = useIndicatorReading();
    const db = useDataPort();
    const { settings, loading: settingsLoading } = useSettings();
    const license = useLicense();
    useRemoveInitialSplash(!settingsLoading);
    const ticket = useWeighingTicket(settings.OperatorName, settings.Rules.SameTicketNo);
    const otherPack = packs.find((pack) => pack.Code !== "en") ?? null;
    const { openTicket, resetTicketSeries } = useShellTicketActions(ticket, db, setActiveTab);
    const { reportsIntent, onNavigateToReports } = useReportsNavigation(setActiveTab);
    useDraftLabelSync(t);
    const { topRight } = useShellTopBar({
        windowPin,
        lang,
        setLang,
        otherPack,
        helpOpen,
        setHelpOpen,
        onOpenSettings: () => setActiveTab("settings"),
    });

    return (
        <ShellBody
            settings={settings}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            topRight={topRight}
            reading={reading}
            lang={lang}
            t={t}
            license={license}
            ticket={ticket}
            openTicket={openTicket}
            onNavigateToReports={onNavigateToReports}
            resetTicketSeries={resetTicketSeries}
            onAddLanguagePack={onAddLanguagePack}
            reportsIntent={reportsIntent}
            helpOpen={helpOpen}
            setHelpOpen={setHelpOpen}
        />
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

// Settings' Integrations → "QR verification page" toggle, same "Applied
// immediately" shape as StabilityGateSync/
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
            framing: {
                dataBits: conn.IndicatorDataBits,
                parity: conn.IndicatorParity,
                stopBits: conn.IndicatorStopBits,
                lineEndingByte: conn.IndicatorLineEndingByte,
                reverseDigits: conn.IndicatorReverseDigits,
                startChar: conn.IndicatorStartChar,
                endChar: conn.IndicatorEndChar,
            },
        });
    }, [
        indicator,
        conn.IndicatorPort,
        conn.IndicatorBaud,
        conn.IndicatorPattern,
        conn.IndicatorDataBits,
        conn.IndicatorParity,
        conn.IndicatorStopBits,
        conn.IndicatorLineEndingByte,
        conn.IndicatorReverseDigits,
        conn.IndicatorStartChar,
        conn.IndicatorEndChar,
    ]);
    return null;
};

// The scheduled daily summary. Same "Applied
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
// — a true OS-level scheduler, closing that gap. This per-minute check stays
// as the belt to that OS-level suspenders': it still catches the case a
// site never lets the OS task register at all (disabled, non-Windows dev
// build) or the one time the machine happens to be already open and idle
// right as `cfg.Time` ticks over.
interface DailySummarySendArgs {
    db: ReturnType<typeof useDataPort>;
    email: ReturnType<typeof createEmailSource>;
    today: string;
    to: string;
    amountDp: ReturnType<typeof useSettings>["settings"]["Formats"]["AmountDp"];
    smtp: ReturnType<typeof useSettings>["settings"]["Smtp"];
    recordDailySummarySent: (date: string) => Promise<void>;
}

// The enqueue→SMTP→update chain shared by DailySummarySync's per-minute
// check below — pulled out purely so that component stays under the
// per-function line budget, not shared with HeadlessDailySummarySync (see
// that component's own "deliberately its own small duplicate" comment).
const sendDailySummary = async ({
    db,
    email,
    today,
    to,
    amountDp,
    smtp,
    recordDailySummarySent,
}: DailySummarySendArgs): Promise<void> => {
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
    await db.updateOutbox(outboxRow.OutboxId, reconcileOutboxOutcome(result, outboxRow.Attempts));
    await recordDailySummarySent(today);
};

const DailySummarySync = () => {
    const db = useDataPort();
    const { settings, recordDailySummarySent } = useSettings();
    const [email] = useState(() => createEmailSource());
    const cfg = settings.DailySummary;
    const smtp = settings.Smtp;
    const amountDp = settings.Formats.AmountDp;
    // Guards against overlapping sends: `cfg.LastSentDate` only updates once
    // the whole enqueue→SMTP→update chain below finishes, and the 60s tick
    // re-checks nothing else — without this, an SMTP send that takes longer
    // than 60s (or a rejection, see the missing-catch fix below) lets the
    // next tick pass the same "not sent today" check and send a duplicate
    // summary. Same shape as HeadlessDailySummarySync's own `hasRunRef`.
    const sendingRef = useRef(false);

    useEffect(() => {
        if (!cfg.Enabled) return;
        const checkDue = (): void => {
            if (sendingRef.current) return;
            const today = todayLocalDate();
            if (cfg.LastSentDate === today) return;
            // Normally wait for the scheduled time of day — but once a
            // whole day's been skipped outright (see isMoreThanOneDayLate's
            // own comment), catch up on this launch instead of waiting for
            // the clock to hit `cfg.Time` again, which it may never do.
            if (nowLocalHm() < cfg.Time && !isMoreThanOneDayLate(cfg.LastSentDate, today)) return;
            const to = cfg.Recipient.trim();
            if (!to) return;
            sendingRef.current = true;
            void sendDailySummary({ db, email, today, to, amountDp, smtp, recordDailySummarySent })
                // Without this, a rejection anywhere in the chain (SMTP
                // down, DB error) becomes an unhandled rejection:
                // `recordDailySummarySent` never runs, `LastSentDate` stays
                // stale, and — worse — `sendingRef` would stay stuck true
                // forever, so the `finally` below is what makes the next
                // tick's retry actually possible instead of wedging this
                // sync permanently off.
                .catch((err: unknown) => {
                    console.error("Daily summary send failed", err);
                })
                .finally(() => {
                    sendingRef.current = false;
                });
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

// The true OS-level scheduler — registers (or removes) the Windows
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

// Both loaded together on startup — split out of useAppTicketSchema purely
// to stay under the per-function line budget (docs/CodingStandards.md).
const loadAppTicketSchemaState = (
    db: ReturnType<typeof useDataPort>,
): Promise<{ active: Schema; list: Schema[] }> =>
    Promise.all([loadTicketSchema(db), listTicketSchemas(db)]).then(([active, list]) => ({ active, list }));

// Loaded from `config` (ConfigKind: "Schema") — same "caller loads, provider
// just wires it up" split as useAppLanguagePacks above. A fresh install has
// no row yet, so `loadTicketSchema` itself falls back to
// `DEFAULT_TICKET_SCHEMA` (db/schema.ts) rather than seeding a row here; the
// schema only gets persisted once a site actually saves its own. Multiple
// schemas can be saved side by side, with a dropdown to list them —
// `schemas` is every one of them, `ticketSchema` is whichever is currently
// active.
const useAppTicketSchema = (db: ReturnType<typeof useDataPort>) => {
    const [ticketSchema, setTicketSchemaState] = useState<Schema>(DEFAULT_TICKET_SCHEMA);
    const [schemas, setSchemas] = useState<Schema[]>([DEFAULT_TICKET_SCHEMA]);

    useEffect(() => {
        let cancelled = false;
        void loadAppTicketSchemaState(db).then(({ active, list }) => {
            if (cancelled) return;
            setTicketSchemaState(active);
            setSchemas(list);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Passed to SchemaProvider as `onSetTicketSchema` — reachable from
    // anywhere in the tree via `useSchema()`. Saving with a SchemaId that's
    // already in `schemas` overwrites that entry in place (db/schema.ts);
    // a field-visibility toggle re-saves the active schema this same way.
    const setTicketSchema = async (schema: Schema): Promise<void> => {
        await saveTicketSchema(db, schema);
        setTicketSchemaState(schema);
        setSchemas((prev) => [...prev.filter((existing) => existing.SchemaId !== schema.SchemaId), schema]);
    };

    // The dropdown's own handler — switches which already-saved schema is
    // active without touching any saved row.
    const setActiveSchemaId = async (schemaId: string): Promise<void> => {
        const schema = schemas.find((existing) => existing.SchemaId === schemaId) ?? DEFAULT_TICKET_SCHEMA;
        await setActiveTicketSchemaId(db, schemaId);
        setTicketSchemaState(schema);
    };

    return { ticketSchema, schemas, setTicketSchema, setActiveSchemaId };
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
    const { ticketSchema, schemas, setTicketSchema, setActiveSchemaId } = useAppTicketSchema(db);

    return (
        <I18nProvider packs={packs}>
            <ToastProvider>
                <CustomCursor />
                <DataPortProvider db={db}>
                    <SettingsProvider>
                        <LicenseProvider source={licensing}>
                            <IndicatorProvider source={indicator}>
                                <VerificationServerProvider source={verificationServer}>
                                    <TunnelProvider source={tunnel}>
                                        <SchemaProvider
                                            ticketSchema={ticketSchema}
                                            schemas={schemas}
                                            onSetTicketSchema={setTicketSchema}
                                            onSetActiveSchemaId={setActiveSchemaId}
                                        >
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
            </ToastProvider>
        </I18nProvider>
    );
};
