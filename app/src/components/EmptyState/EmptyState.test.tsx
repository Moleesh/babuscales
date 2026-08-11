import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
    it("always renders the title", () => {
        render(<EmptyState title="No parties yet" />);
        expect(screen.getByText("No parties yet")).toBeInTheDocument();
    });

    it("renders icon, hint and action only when given", () => {
        render(
            <EmptyState
                title="No parties yet"
                icon={<span data-testid="icon">•</span>}
                hint="Add your first party below"
                action={<button>Add party</button>}
            />,
        );
        expect(screen.getByTestId("icon")).toBeInTheDocument();
        expect(screen.getByText("Add your first party below")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add party" })).toBeInTheDocument();
    });

    it("omits hint when not given", () => {
        render(<EmptyState title="No parties yet" />);
        expect(screen.queryByText(/add your first/i)).toBeNull();
    });
});
