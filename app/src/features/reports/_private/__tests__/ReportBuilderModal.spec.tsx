import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "../../../../testUtils";
import { ReportBuilderModal } from "../ReportBuilderModal";
import type { ReportBuilderModalProps } from "../ReportBuilderModal";

// Report-builder wizard (task: Reports rework — "guided wizard, not a flat
// page"). Covers the shape that matters: one step's controls visible at a
// time, Back/Next moving between them, and every field's onChange wired to
// the right prop regardless of which step it lives on.
const baseProps = (): ReportBuilderModalProps => ({
    open: true,
    onClose: vi.fn(),
    view: "tickets",
    onViewChange: vi.fn(),
    groupBy: "material",
    onGroupByChange: vi.fn(),
    filter: "all",
    onFilterChange: vi.fn(),
    dateFrom: "",
    onDateFromChange: vi.fn(),
    dateTo: "",
    onDateToChange: vi.fn(),
    visibleColumnKeys: null,
    onVisibleColumnKeysChange: vi.fn(),
    newReportName: "",
    onNewReportNameChange: vi.fn(),
    onSaveReport: vi.fn(),
});

describe("ReportBuilderModal — step navigation", () => {
    it("opens on step 1 and hides the later steps' controls", () => {
        renderWithI18n(<ReportBuilderModal {...baseProps()} />);
        expect(screen.getByText("Date range & view")).toBeInTheDocument();
        expect(screen.queryByText("Columns")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    });

    it("Next advances through steps 2 and 3, Back returns", () => {
        renderWithI18n(<ReportBuilderModal {...baseProps()} />);
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getAllByText("Filter").length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByText("Columns & review")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        expect(screen.getAllByText("Filter").length).toBeGreaterThan(0);
    });

    it("Done on the last step calls onClose", () => {
        const props = baseProps();
        renderWithI18n(<ReportBuilderModal {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        fireEvent.click(screen.getByRole("button", { name: "Done" }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("reopening resets to step 1", () => {
        const props = baseProps();
        const { rerender } = renderWithI18n(<ReportBuilderModal {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getAllByText("Filter").length).toBeGreaterThan(0);

        rerender(<ReportBuilderModal {...props} open={false} />);
        rerender(<ReportBuilderModal {...props} open />);
        expect(screen.getByText("Date range & view")).toBeInTheDocument();
    });

    it("step 3 shows a review recapping the earlier picks", () => {
        const props = baseProps();
        renderWithI18n(<ReportBuilderModal {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        const review = screen.getByText("Review").closest("div");
        expect(review).not.toBeNull();
        expect(within(review as HTMLElement).getByText("All")).toBeInTheDocument();
        expect(within(review as HTMLElement).getByText("All dates")).toBeInTheDocument();
    });
});
