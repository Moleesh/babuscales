import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { cssClass, renderWithI18n } from "../../../testUtils";
import styles from "../_styles/AppShell.module.css";
import { AppShell } from "../AppShell";
import type { AppShellTab } from "../AppShell";

const TABS: AppShellTab[] = [
    { key: "dashboard", label: "Dashboard", icon: <span>D</span> },
    { key: "weighing", label: "Weighing", icon: <span>W</span> },
];

describe("AppShell", () => {
    it("renders the site label and one tab button per entry", () => {
        renderWithI18n(
            <AppShell siteLabel="Sri Lakshmi Blue Metals" tabs={TABS} activeTab="dashboard" onNavigate={vi.fn()}>
                <p>Screen content</p>
            </AppShell>,
        );
        expect(screen.getByText("Sri Lakshmi Blue Metals")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Weighing" })).toBeInTheDocument();
        expect(screen.getByText("Screen content")).toBeInTheDocument();
    });

    it("marks the active tab with aria-current and the active class", () => {
        renderWithI18n(
            <AppShell siteLabel="Site" tabs={TABS} activeTab="weighing" onNavigate={vi.fn()}>
                content
            </AppShell>,
        );
        const active = screen.getByRole("button", { name: "Weighing" });
        expect(active).toHaveAttribute("aria-current", "page");
        expect(active).toHaveClass(cssClass(styles.active));
        expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    });

    it("calls onNavigate with the clicked tab's key", () => {
        const onNavigate = vi.fn();
        renderWithI18n(
            <AppShell siteLabel="Site" tabs={TABS} activeTab="dashboard" onNavigate={onNavigate}>
                content
            </AppShell>,
        );
        fireEvent.click(screen.getByRole("button", { name: "Weighing" }));
        expect(onNavigate).toHaveBeenCalledWith("weighing");
    });

    it("renders topRight, header and banner slots only when given", () => {
        const { rerender } = renderWithI18n(
            <AppShell siteLabel="Site" tabs={TABS} activeTab="dashboard" onNavigate={vi.fn()}>
                content
            </AppShell>,
        );
        expect(screen.queryByText("Banner text")).toBeNull();

        rerender(
            <AppShell
                siteLabel="Site"
                tabs={TABS}
                activeTab="dashboard"
                onNavigate={vi.fn()}
                topRight={<span>Operator: Raj</span>}
                header={<span>Header readout</span>}
                banner={<span>Banner text</span>}
            >
                content
            </AppShell>,
        );
        expect(screen.getByText("Operator: Raj")).toBeInTheDocument();
        expect(screen.getByText("Header readout")).toBeInTheDocument();
        expect(screen.getByText("Banner text")).toBeInTheDocument();
    });
});
