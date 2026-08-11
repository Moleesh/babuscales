import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatWeightKg } from "@constants/numberFormat";

import { StatusPill } from "./StatusPill";
import styles from "./StatusPill.module.css";
import { cssClass } from "../../testUtils";

describe("StatusPill", () => {
    it("shows an em dash for every segment when nothing is captured yet", () => {
        render(<StatusPill />);
        expect(screen.getAllByText("—")).toHaveLength(3);
    });

    it("computes net as gross - tare when netKg isn't supplied (single-gross fallback)", () => {
        render(<StatusPill tareKg={1000} grossKg={3500} />);
        expect(screen.getByText(formatWeightKg(1000))).toBeInTheDocument();
        expect(screen.getByText(formatWeightKg(3500))).toBeInTheDocument();
        expect(screen.getByText(formatWeightKg(2500))).toBeInTheDocument();
    });

    it("uses the ticket's own netKg (task #46 multi-gross) instead of gross - tare when given", () => {
        // Two Gross captures summing to more net than grossKg - tareKg would.
        render(<StatusPill tareKg={1000} grossKg={3500} netKg={4200} />);
        expect(screen.getByText(formatWeightKg(4200))).toBeInTheDocument();
        expect(screen.queryByText(formatWeightKg(2500))).toBeNull();
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
