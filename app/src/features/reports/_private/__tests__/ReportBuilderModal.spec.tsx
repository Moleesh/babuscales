import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "../../../../testUtils";
import { ReportBuilderModal } from "../ReportBuilderModal";
import type { ReportBuilderModalProps } from "../ReportBuilderModal";

// Report-builder modal — single-page form (collapsed from the old 3-step
// wizard). Covers: every field is visible at once, edits stay local to the
// modal's own draft (draft isolation — item 1) until Save, and Save both
// commits the draft + name (item 3: auto-apply) and closes the modal.
const baseProps = (): ReportBuilderModalProps => ({
    open: true,
    onClose: vi.fn(),
    initialView: "tickets",
    initialGroupBy: "material",
    initialFilter: "all",
    initialDateFrom: "",
    initialDateTo: "",
    initialVisibleColumnKeys: null,
    onSaveReport: vi.fn(),
});

describe("ReportBuilderModal — single-page draft", () => {
    it("shows every field on one screen, no step navigation", () => {
        renderWithI18n(<ReportBuilderModal {...baseProps()} />);
        expect(screen.getByRole("button", { name: "Waiting for the second weight" })).toBeInTheDocument();
        // Appears twice — the Columns section heading and the Review recap's
        // own "Columns" row — so this just asserts it's present at all.
        expect(screen.getAllByText("Columns").length).toBeGreaterThan(0);
        expect(screen.getByText("Review")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    });

    it("editing fields does not call any live onChange prop — only the local draft moves", () => {
        renderWithI18n(<ReportBuilderModal {...baseProps()} />);
        fireEvent.click(screen.getByRole("button", { name: "Waiting for the second weight" }));
        // Review recap reflects the draft edit immediately.
        const review = screen.getByText("Review").closest("div");
        expect(review).not.toBeNull();
        expect(within(review as HTMLElement).getByText("Waiting for the second weight")).toBeInTheDocument();
    });

    it("Save is disabled until a name is entered, then commits the draft and closes", () => {
        const props = baseProps();
        renderWithI18n(<ReportBuilderModal {...props} />);
        const saveButton = screen.getByRole("button", { name: "Save view" });
        expect(saveButton).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText("Save current view as…"), {
            target: { value: "My report" },
        });
        expect(saveButton).not.toBeDisabled();
        fireEvent.click(saveButton);

        expect(props.onSaveReport).toHaveBeenCalledTimes(1);
        expect(props.onSaveReport).toHaveBeenCalledWith(
            {
                view: "tickets",
                groupBy: "material",
                filter: "all",
                dateFrom: "",
                dateTo: "",
                visibleColumnKeys: null,
            },
            "My report",
        );
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("reopening resets the draft to the current screen config", () => {
        const props = baseProps();
        const { rerender } = renderWithI18n(<ReportBuilderModal {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Waiting for the second weight" }));
        const reviewBefore = screen.getByText("Review").closest("div");
        expect(within(reviewBefore as HTMLElement).getByText("Waiting for the second weight")).toBeInTheDocument();

        rerender(<ReportBuilderModal {...props} open={false} />);
        rerender(<ReportBuilderModal {...props} open />);
        const reviewAfter = screen.getByText("Review").closest("div");
        expect(within(reviewAfter as HTMLElement).getByText("All")).toBeInTheDocument();
    });
});
