import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatWeightIn } from "@constants/numberFormat";

import { cssClass } from "../../../testUtils";
import styles from "../_styles/StatusPill.module.css";
import { StatusPill } from "../StatusPill";

describe("StatusPill", () => {
    it("shows an em dash for every segment when nothing is captured yet", () => {
        render(<StatusPill />);
        expect(screen.getAllByText("—")).toHaveLength(3);
    });

    it("computes net as gross - tare when netKg isn't supplied (single-gross fallback)", () => {
        render(<StatusPill tareKg={1000} grossKg={3500} />);
        expect(screen.getByText(formatWeightIn(1000, "kg", "en"))).toBeInTheDocument();
        expect(screen.getByText(formatWeightIn(3500, "kg", "en"))).toBeInTheDocument();
        expect(screen.getByText(formatWeightIn(2500, "kg", "en"))).toBeInTheDocument();
    });

    it("uses the ticket's own netKg (multi-gross) instead of gross - tare when given", () => {
        // Two Gross captures summing to more net than grossKg - tareKg would.
        render(<StatusPill tareKg={1000} grossKg={3500} netKg={4200} />);
        expect(screen.getByText(formatWeightIn(4200, "kg", "en"))).toBeInTheDocument();
        expect(screen.queryByText(formatWeightIn(2500, "kg", "en"))).toBeNull();
    });

    it("renders custom labels when given", () => {
        render(<StatusPill labels={{ tare: "Empty", gross: "Loaded", net: "Delivered" }} />);
        expect(screen.getByText("Empty")).toBeInTheDocument();
        expect(screen.getByText("Loaded")).toBeInTheDocument();
        expect(screen.getByText("Delivered")).toBeInTheDocument();
    });

    it("adds the cancelled class when cancelled", () => {
        const { container } = render(<StatusPill cancelled />);
        expect(container.firstChild).toHaveClass(cssClass(styles.cancelled));
    });
});
