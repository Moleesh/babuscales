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
import { CamerasScreen } from "@features/cameras";
import { DashboardScreen } from "@features/dashboard";
import { MastersScreen } from "@features/masters";
import { ReportsScreen } from "@features/reports";
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
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

// A demo pack, not real content — proves a pack overrides a subset of keys
// and everything else falls through to English (PLAN §8.3). Actual Tamil
// content is authoring work, not infrastructure.
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
    onToggleLang: () => void;
    helpOpen: boolean;
    onToggleHelp: () => void;
    helpTitle: string;
}

const TopBarActions = ({
    lang,
    onToggleLang,
    helpOpen,
    onToggleHelp,
    helpTitle,
}: TopBarActionsProps) => (
    <>
        <button className="chip act" onClick={onToggleLang}>
            {lang === "ta" ? "தமிழ்" : "English"}
        </button>
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
}: TabContentProps) => {
    switch (tab) {
        case "dash":
            return <DashboardScreen onNavigateToReports={onNavigateToReports} />;
        case "weigh":
            return <WeighingScreen ticket={ticket} />;
        case "reports":
            return <ReportsScreen onOpenTicket={onOpenTicket} />;
        case "masters":
            return <MastersScreen />;
        case "settings":
            return <SettingsScreen onResetTicketSeries={onResetTicketSeries} />;
        case "cameras":
            return <CamerasScreen ticket={ticket} />;
    }
};

const Shell = () => {
    const { t, lang, setLang } = useTranslation();
    const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("weigh");
    const [helpOpen, setHelpOpen] = useState(false);
    const reading = useIndicatorReading();
    const db = useDataPort();
    const { settings } = useSettings();
    const ticket = useWeighingTicket(settings.Rules.TareFirst, settings.OperatorName);

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
                    onToggleLang={() => setLang(lang === "ta" ? "en" : "ta")}
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
        >
            <TabContent
                tab={activeTab}
                ticket={ticket}
                onOpenTicket={openTicket}
                onNavigateToReports={() => setActiveTab("reports")}
                onResetTicketSeries={resetTicketSeries}
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

export const App = () => {
    const [db] = useState(() => createDataPort());
    const [indicator] = useState(() => createIndicatorSource());

    return (
        <I18nProvider packs={[DEMO_TAMIL_PACK]}>
            <DataPortProvider db={db}>
                <SettingsProvider>
                    <IndicatorProvider source={indicator}>
                        <StabilityGateSync indicator={indicator} />
                        <SerialConnectionSync indicator={indicator} />
                        <Shell />
                    </IndicatorProvider>
                </SettingsProvider>
            </DataPortProvider>
        </I18nProvider>
    );
};
