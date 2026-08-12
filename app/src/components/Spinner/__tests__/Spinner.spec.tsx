import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "../Spinner";

describe("Spinner", () => {
    it("announces its label to screen readers via a status region", () => {
        render(<Spinner label="Loading tickets…" />);
        expect(screen.getByRole("status")).toHaveTextContent("Loading tickets…");
    });
});
