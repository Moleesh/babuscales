import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatWeightIn } from "@constants/numberFormat";

import { cssClass } from "../../../testUtils";
import styles from "../_styles/WeightDisplay.module.css";
import { WeightDisplay } from "../WeightDisplay";

describe("WeightDisplay", () => {
    it("shows the live weight, formatted with the shared weight formatter", () => {
        // The "0 / 50,000 kg" capacity-ratio text was removed (bug
        // report: it can read as a warning to operators) — the fill bar
        // (still driven by capacityKg) is the only remaining capacity cue.
        render(<WeightDisplay weightKg={1250} capacityKg={50000} stable motion={false} />);
        // formatWeightIn appends " kg" itself; the digits span strips that
        // suffix since the unit is shown separately via `labels.unit`.
        expect(screen.getByText(formatWeightIn(1250, "kg", "en").replace(/\s\S+$/, ""))).toBeInTheDocument();
    });

    it("relabels to the given weightUnit without changing the digits, still showing the unit only once", () => {
        // labels.unit is caller-supplied (App.tsx derives it from the same
        // Formats.WeightUnit) — passed here so digits and label agree, same
        // as the real call site. formatWeightIn is a text-only unit swap
        // now (no kg→t math), so the digits stay "1,250" either way.
        render(
            <WeightDisplay
                weightKg={1250}
                capacityKg={50000}
                stable
                motion={false}
                weightUnit="t"
                labels={{ indicator: "Indicator", stable: "Stable", motion: "Motion", unit: "t" }}
            />,
        );
        expect(screen.getByText("1,250")).toBeInTheDocument();
        expect(screen.getAllByText("t")).toHaveLength(1);
    });

    it("lights the stable lamp only when stable, and the motion lamp only when in motion", () => {
        render(<WeightDisplay weightKg={0} capacityKg={50000} stable motion={false} />);
        expect(screen.getByText("Stable").closest("span")).toHaveClass(cssClass(styles.on));
        expect(screen.getByText("Motion").closest("span")).not.toHaveClass(cssClass(styles.busy));
    });

    it("renders custom labels when given", () => {
        render(
            <WeightDisplay
                weightKg={0}
                capacityKg={50000}
                stable={false}
                motion={false}
                labels={{ indicator: "Bridge 1", stable: "Steady", motion: "Moving", unit: "T" }}
            />,
        );
        expect(screen.getByRole("region", { name: "Bridge 1" })).toBeInTheDocument();
        expect(screen.getByText("Steady")).toBeInTheDocument();
        expect(screen.getByText("Moving")).toBeInTheDocument();
    });

    it("applies the compact class only when mode is compact", () => {
        const { rerender, container } = render(
            <WeightDisplay weightKg={0} capacityKg={50000} stable={false} motion={false} />,
        );
        expect(container.firstChild).not.toHaveClass(cssClass(styles.compact));

        rerender(<WeightDisplay weightKg={0} capacityKg={50000} stable={false} motion={false} mode="compact" />);
        expect(container.firstChild).toHaveClass(cssClass(styles.compact));
    });

    it("fills the capacity bar in proportion to weight/capacity, capped at 100%", () => {
        const { container } = render(
            <WeightDisplay weightKg={60000} capacityKg={50000} stable={false} motion={false} />,
        );
        const bar = container.querySelector(`.${styles.capBar}`) as HTMLElement;
        expect(bar.style.width).toBe("100%");
    });
});
