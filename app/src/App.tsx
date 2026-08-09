import { useState } from "react";

import { AppShell } from "@components/AppShell";
import type { AppShellTab } from "@components/AppShell";
import { Button } from "@components/Button";
import { ContextualHelp } from "@components/ContextualHelp";
import { StatusPill } from "@components/StatusPill";
import { WeightDisplay } from "@components/WeightDisplay";
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

// See src/App.tsx's earlier revision history: this proves the ported
// components hold together, not the Weighing feature (Phase 2, PLAN §21).
const WeighingPreview = () => {
    const { t } = useTranslation();
    const [captured, setCaptured] = useState(false);
    return (
        <div style={{ display: "grid", gap: 12 }}>
            <StatusPill
                tareKg={captured ? 12340 : null}
                grossKg={captured ? 31120 : null}
                labels={{ tare: t("tare"), gross: t("gross"), net: t("net") }}
            />
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <Button
                    variant="primary"
                    caption="Design-system check"
                    onClick={() => setCaptured((v) => !v)}
                >
                    {captured ? "Clear" : "Capture Tare"}
                </Button>
                <Button disabled={!captured}>Save</Button>
                <Button variant="danger" disabled={!captured} onClick={() => setCaptured(false)}>
                    Clear
                </Button>
            </div>
        </div>
    );
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

const Shell = () => {
    const { t, lang, setLang } = useTranslation();
    const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("weigh");
    const [helpOpen, setHelpOpen] = useState(false);

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
                    weightKg={0}
                    capacityKg={60000}
                    stable={false}
                    motion={false}
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
            {activeTab === "weigh" ? (
                <WeighingPreview />
            ) : (
                <p className="lbl">{tabs.find((tab) => tab.key === activeTab)?.label} — Phase 2</p>
            )}
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

export const App = () => (
    <I18nProvider packs={[DEMO_TAMIL_PACK]}>
        <Shell />
    </I18nProvider>
);
