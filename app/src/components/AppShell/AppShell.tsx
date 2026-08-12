import { useRef } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "@i18n/useTranslation";

import { BrandMark } from "./_private/BrandMark";
import { TopBarOverflow } from "./_private/TopBarOverflow";
import { useEnterAsTab } from "./_private/useEnterAsTab";
import { useTopBarFit } from "./_private/useTopBarFit";
import styles from "./_styles/AppShell.module.css";

export interface AppShellTab {
    key: string;
    label: string;
    icon: ReactNode;
}

export interface AppShellProps {
    /** e.g. "Babulens Enterprise · Nagercoil · 9789597007" — configured per site. */
    siteLabel: string;
    tabs: AppShellTab[];
    activeTab: string;
    onNavigate: (key: string) => void;
    /** Comm/operator/admin chips and the help button — feature-owned, not the shell's business.
        Collapses behind TopBarOverflow's "..." menu once the row is too narrow (task #62). */
    topRight?: ReactNode;
    /** The always-on-top pin toggle (App.tsx) — always visible in the top bar,
        never collapsed into the overflow menu (task #62). */
    pin?: ReactNode;
    /** The weight indicator readout — sits above every screen, full-size on Weighing (PLAN §13). */
    header?: ReactNode;
    /** A persistent, full-width strip above every screen (e.g. `@features/licensing`'s trial/expiry notice) — feature-owned content, same as `topRight`/`header`; the shell just reserves the slot. Absent (not rendered) when there's nothing to say. */
    banner?: ReactNode;
    children: ReactNode;
}

interface TabButtonProps {
    tab: AppShellTab;
    active: boolean;
    onNavigate: (key: string) => void;
    /** Set for tabs rendered inside TopBarOverflow's menu (task #62) — swaps
        the `role` and always shows the label, which the icon-only <=880px
        rule would otherwise hide. */
    inMenu?: boolean;
}

const TabButton = ({ tab, active, onNavigate, inMenu }: TabButtonProps) => (
    <button
        className={`${styles.tab} ${active ? styles.active : ""}`}
        role={inMenu ? "menuitem" : undefined}
        aria-current={active ? "page" : undefined}
        aria-label={tab.label}
        title={tab.label}
        onClick={() => onNavigate(tab.key)}
    >
        <span className={styles.tabIcon}>{tab.icon}</span>
        <span className={inMenu ? undefined : styles.tabLabel}>{tab.label}</span>
    </button>
);

interface TopBarProps extends Pick<AppShellProps, "siteLabel" | "activeTab" | "onNavigate" | "topRight" | "pin"> {
    tabs: AppShellTab[];
    sectionsLabel: string;
}

// The brandbox + tabs + secondary-controls row itself, split out of
// AppShell below purely to stay under the file's own line budget — task
// #62's overflow split (which tabs render inline vs. inside
// TopBarOverflow's menu) is still decided by AppShell, not here.
const TopBar = ({ siteLabel, tabs, activeTab, onNavigate, topRight, pin, sectionsLabel }: TopBarProps) => {
    const barRef = useRef<HTMLElement>(null);
    const { visibleTabCount, secondaryCollapsed } = useTopBarFit(barRef, tabs.length);
    const visibleTabs = tabs.slice(0, visibleTabCount);
    const overflowTabs = tabs.slice(visibleTabCount);

    return (
        <header className={styles.top} ref={barRef}>
            <div className={styles.brandbox}>
                <BrandMark />
                <div style={{ minWidth: 0 }}>
                    <div className={styles.brand}>
                        Babu<em>Scales</em>
                    </div>
                    <div className={styles.site}>{siteLabel}</div>
                </div>
            </div>

            <nav className={styles.tabs} aria-label={sectionsLabel}>
                {visibleTabs.map((tab) => (
                    <TabButton key={tab.key} tab={tab} active={tab.key === activeTab} onNavigate={onNavigate} />
                ))}
            </nav>

            <div className={styles.topRight}>
                {pin}
                <TopBarOverflow collapsed={secondaryCollapsed || overflowTabs.length > 0}>
                    {overflowTabs.map((tab) => (
                        <TabButton
                            key={tab.key}
                            tab={tab}
                            active={tab.key === activeTab}
                            onNavigate={onNavigate}
                            inMenu
                        />
                    ))}
                    {topRight}
                </TopBarOverflow>
            </div>
        </header>
    );
};

// The five-tab frame every screen lives inside (PLAN §13.1 — dashboard,
// weighing, cameras, reports, masters; Settings moved to the secondary
// controls, App.tsx's `topRight`). Enter-as-Tab is wired here once, for the
// whole app, rather than per-screen.
//
// Task #62: primary tabs must never visually clip. `TopBar` (above) uses
// `useVisibleTabCount` to decide how many of `tabs` fit the row at the
// current width; whatever's left moves into the same TopBarOverflow menu
// that already collapses the secondary controls, trailing tabs first.
export const AppShell = ({
    siteLabel,
    tabs,
    activeTab,
    onNavigate,
    topRight,
    pin,
    header,
    banner,
    children,
}: AppShellProps) => {
    useEnterAsTab();
    const { t } = useTranslation();

    return (
        <div className={styles.app}>
            {banner && <div className={styles.banner}>{banner}</div>}
            <TopBar
                siteLabel={siteLabel}
                tabs={tabs}
                activeTab={activeTab}
                onNavigate={onNavigate}
                topRight={topRight}
                pin={pin}
                sectionsLabel={t("components.appShell.sections")}
            />

            <div className={styles.main} data-enter-scope>
                {header}
                <div className={styles.screen}>{children}</div>
            </div>
        </div>
    );
};
