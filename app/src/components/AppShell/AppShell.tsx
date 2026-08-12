import type { ReactNode } from "react";

import { useTranslation } from "@i18n/useTranslation";

import { BrandMark } from "./_private/BrandMark";
import { useEnterAsTab } from "./_private/useEnterAsTab";
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
    /** Comm/operator/admin chips and the help button — feature-owned, not the shell's business. */
    topRight?: ReactNode;
    /** The weight indicator readout — sits above every screen, full-size on Weighing (PLAN §13). */
    header?: ReactNode;
    /** A persistent, full-width strip above every screen (e.g. `@features/licensing`'s trial/expiry notice) — feature-owned content, same as `topRight`/`header`; the shell just reserves the slot. Absent (not rendered) when there's nothing to say. */
    banner?: ReactNode;
    children: ReactNode;
}

// The six-tab frame every screen lives inside (PLAN §13.1 — dashboard,
// weighing, cameras, reports, masters, settings; no separate Tickets tab).
// Enter-as-Tab is wired here once, for the whole app, rather than per-screen.
export const AppShell = ({
    siteLabel,
    tabs,
    activeTab,
    onNavigate,
    topRight,
    header,
    banner,
    children,
}: AppShellProps) => {
    useEnterAsTab();
    const { t } = useTranslation();

    return (
        <div className={styles.app}>
            {banner && <div className={styles.banner}>{banner}</div>}
            <header className={styles.top}>
                <div className={styles.brandbox}>
                    <BrandMark />
                    <div style={{ minWidth: 0 }}>
                        <div className={styles.brand}>
                            Babu<em>Scales</em>
                        </div>
                        <div className={styles.site}>{siteLabel}</div>
                    </div>
                </div>

                <nav className={styles.tabs} aria-label={t("components.appShell.sections")}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`${styles.tab} ${tab.key === activeTab ? styles.active : ""}`}
                            aria-current={tab.key === activeTab ? "page" : undefined}
                            aria-label={tab.label}
                            title={tab.label}
                            onClick={() => onNavigate(tab.key)}
                        >
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            {/* Hidden below the tablet breakpoint (icon-only tabs) —
                                `aria-label`/`title` above keep the button named either
                                way. See AppShell.module.css's responsive rules. */}
                            <span className={styles.tabLabel}>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className={styles.topRight}>{topRight}</div>
            </header>

            <div className={styles.main} data-enter-scope>
                {header}
                <div className={styles.screen}>{children}</div>
            </div>
        </div>
    );
};
