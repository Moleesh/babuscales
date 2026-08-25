import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

import { ScrollArea } from "@components/ScrollArea";
import { Tooltip } from "@components/Tooltip";
import { useTranslation } from "@i18n/useTranslation";

import { BrandMark } from "./_private/BrandMark";
import { ContextMenu } from "./_private/ContextMenu";
import { TopBarOverflow } from "./_private/TopBarOverflow";
import { useContextMenu } from "./_private/useContextMenu";
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
        Collapses behind TopBarOverflow's "..." menu once the row is too narrow. */
    topRight?: ReactNode;
    /** The always-on-top pin toggle (App.tsx) — always visible in the top bar,
        never collapsed into the overflow menu. */
    pin?: ReactNode;
    /** The weight indicator readout — sits above every screen, full-size on Weighing. */
    header?: ReactNode;
    /** A persistent, full-width strip above every screen (e.g. `@features/licensing`'s trial/expiry notice) — feature-owned content, same as `topRight`/`header`; the shell just reserves the slot. Absent (not rendered) when there's nothing to say. */
    banner?: ReactNode;
    children: ReactNode;
}

interface TabButtonProps {
    tab: AppShellTab;
    active: boolean;
    onNavigate: (key: string) => void;
    /** Set for tabs rendered inside TopBarOverflow's menu — swaps
        the `role` and always shows the label, which the icon-only <=880px
        rule would otherwise hide. */
    inMenu?: boolean;
}

const TabButton = ({ tab, active, onNavigate, inMenu }: TabButtonProps) => (
    // Bug: "tabs don't have a tooltip [visible]" — Tooltip defaults to
    // `side="top"` (opens above the trigger), but these tabs sit in the
    // window's own top title bar with nothing above them to open into; the
    // bubble rendered off the top edge and was clipped by `.app`'s
    // `overflow: hidden` — mounting correctly the whole time, just never
    // visible. Same failure mode `align="end"` already fixes for the
    // top bar's Minimize/Close buttons (Tooltip.tsx's own doc comment).
    <Tooltip label={tab.label} side="bottom">
        <button
            className={`${styles.tab} ${active ? styles.active : ""}`}
            role={inMenu ? "menuitem" : undefined}
            aria-current={active ? "page" : undefined}
            aria-label={tab.label}
            onClick={() => onNavigate(tab.key)}
        >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={inMenu ? undefined : styles.tabLabel}>{tab.label}</span>
        </button>
    </Tooltip>
);

interface TopBarProps extends Pick<AppShellProps, "siteLabel" | "activeTab" | "onNavigate" | "topRight" | "pin"> {
    tabs: AppShellTab[];
    sectionsLabel: string;
}

// The brandbox + tabs + secondary-controls row itself, split out of
// AppShell below purely to stay under the file's own line budget — the
// overflow split (which tabs render inline vs. inside
// TopBarOverflow's menu) is still decided by AppShell, not here.
const TopBar = ({ siteLabel, tabs, activeTab, onNavigate, topRight, pin, sectionsLabel }: TopBarProps) => {
    const barRef = useRef<HTMLElement>(null);
    const { visibleTabCount, secondaryCollapsed } = useTopBarFit(barRef, tabs.length);
    const visibleTabs = tabs.slice(0, visibleTabCount);
    const overflowTabs = tabs.slice(visibleTabCount);

    // Bug: "double scroll bar in pretty much all tabs" — SettingsScreen's own
    // `.screen` sizes itself off raw `100vh` (SettingsScreen.module.css) so
    // it stays under a fixed ceiling and only its own `.pane-area` scrolls;
    // that formula only ever subtracted `--shell-header-h` (the sticky
    // weight readout), never this bar's own height, so it always came out
    // taller than the room actually left in `.main` (AppShell.module.css) —
    // `.main` then had to scroll its own extra few dozen pixels *underneath*
    // `.pane-area`'s already-complete inner scroll, i.e. two nested
    // scrollbars for one screen. `--shell-topbar-h`, same ResizeObserver
    // shape as `useStickyHeaderHeight` below, is what was missing; set on
    // `:root` (not `.main`) since this bar renders as `.main`'s own sibling,
    // not its descendant.
    useEffect(() => {
        const barEl = barRef.current;
        if (!barEl) return;
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            document.documentElement.style.setProperty("--shell-topbar-h", `${entry.contentRect.height}px`);
        });
        observer.observe(barEl);
        return () => observer.disconnect();
    }, []);

    return (
        // `data-tauri-drag-region`: decorations are off (tauri.conf.json),
        // so this bar is the window's whole title bar now — without this,
        // there'd be no way to drag/move the window at all. Buttons/inputs
        // inside still get their own clicks; Tauri only starts a drag from
        // the bar's own background, not its interactive children.
        <header className={styles.top} ref={barRef} data-tauri-drag-region>
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

// Exposes the sticky header's actual rendered height (varies: compact vs
// full-size, per BIG_HEADER_TABS) as a CSS var on `.main` — any other
// sticky element further down (e.g. Settings' own tab bar,
// SettingsScreen.module.css's `.top-row`) can offset its own `top` by
// this instead of also sitting at `top: 0` and disappearing behind the
// header once both are stuck (same z-index=0 slot, header wins on
// z-index). Runs even when `header` is absent — var just settles to 0px.
// Split out of AppShell purely to stay under the file's own line budget.
const useStickyHeaderHeight = (
    mainRef: RefObject<HTMLDivElement | null>,
    headerStickyRef: RefObject<HTMLDivElement | null>,
    header: ReactNode,
): void => {
    // Depend on *presence*, not identity — `header` is a freshly-created
    // element every render of the caller (`<ShellWeightHeader
    // reading={reading} .../>`, and `reading` ticks on every indicator
    // poll), so depending on `header` itself tore the ResizeObserver down
    // and recreated it on nearly every render — often faster than the
    // browser's next resize-observation opportunity, so it kept getting
    // disconnected before ever delivering a callback and
    // `--shell-header-h` never got set at all. That left every sticky
    // element offsetting by it (OpenTicketStrip's `.strip`,
    // WeighingScreen's `.actions-sticky`) falling back to `top: 0px` —
    // the same slot as the header itself — so the strip stacked on top of
    // and visually hid the header once both stuck (reported: "top bar is
    // not sticky", header reduced to a sliver under the OPEN strip).
    const hasHeader = Boolean(header);
    useEffect(() => {
        const headerEl = headerStickyRef.current;
        const mainEl = mainRef.current;
        if (!mainEl) return;
        if (!headerEl) {
            mainEl.style.setProperty("--shell-header-h", "0px");
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            mainEl.style.setProperty("--shell-header-h", `${entry.contentRect.height}px`);
        });
        observer.observe(headerEl);
        return () => observer.disconnect();
    }, [hasHeader, mainRef, headerStickyRef]);
};

// The five-tab frame every screen lives inside — dashboard,
// weighing, cameras, reports, masters; Settings moved to the secondary
// controls, App.tsx's `topRight`. Enter-as-Tab is wired here once, for the
// whole app, rather than per-screen.
//
// Primary tabs must never visually clip. `TopBar` (above) uses
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
    const mainRef = useRef<HTMLDivElement>(null);
    const headerStickyRef = useRef<HTMLDivElement>(null);
    // Mounted once, app-wide, same as CustomCursor — see useContextMenu.ts,
    // which replaces the native right-click menu in desktop view so the
    // app can offer its own copy/cut/paste instead.
    const { menu, close } = useContextMenu();
    useStickyHeaderHeight(mainRef, headerStickyRef, header);

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

            {/* `.main` passed as both `className` (outer) and `contentClassName`
                (inner, scrollable) — its `flex: 1; min-height: 0` sizing has
                to reach the outer element ScrollArea now interposes between
                `.app`'s flex column and the scrollable div itself, same as
                its `overflow: auto`/sticky-header layout has to reach the
                inner one. Harmless to apply both places: the outer only
                ever has the inner content div (plus the thumb, positioned
                absolute) as a child. */}
            <ScrollArea
                contentRef={mainRef}
                className={styles.main}
                contentClassName={styles.main}
                dataAttrs={{ "data-enter-scope": "" }}
            >
                {/* Task: "while scrolling any tab the top weight should not
                    move, it's fixed, except for mobile view" — `.main` is
                    the screen's own scroll container, so the header
                    (WeightDisplay) scrolled away with the rest of the
                    content unless pinned. `position: sticky` (not
                    `fixed` — this still needs to occupy its normal-flow
                    slot above `.screen`, just stop scrolling past `.main`'s
                    own top edge) does that; AppShell.module.css drops the
                    sticky behavior back to plain scroll under the same
                    ~880px mobile breakpoint the tab bar itself uses. */}
                {header && (
                    <div ref={headerStickyRef} className={styles.headerSticky}>
                        {header}
                    </div>
                )}
                <div className={styles.screen}>{children}</div>
            </ScrollArea>
            {menu && <ContextMenu menu={menu} onClose={close} />}
        </div>
    );
};
