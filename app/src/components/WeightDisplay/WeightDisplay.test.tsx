import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatWeightKg } from "@constants/numberFormat";

import { WeightDisplay } from "./WeightDisplay";
import styles from "./WeightDisplay.module.css";
import { cssClass } from "../../testUtils";

describe("WeightDisplay", () => {
    it("shows the live weight and capacity, formatted with the shared weight formatter", () => {
        render(<WeightDisplay weightKg={1250} capacityKg={50000} stable motion={false} />);
        expect(screen.getByText(formatWeightKg(1250))).toBeInTheDocument();
        expect(screen.getByText(`${formatWeightKg(1250)} / ${formatWeightKg(50000)} kg`)).toBeInTheDocument();
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
