import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { HelpTopic } from "@i18n/helpTopics";

import { ContextualHelp } from "./ContextualHelp";

const TOPIC: HelpTopic = {
    Scope: "weigh",
    Heading: { en: "Weighing" },
    Lead: { en: "Capture gross and tare." },
    Points: [{ Term: { en: "Stable" }, Detail: { en: "The reading has settled." } }],
    Tip: { en: "Use Enter to move between fields." },
};

describe("ContextualHelp", () => {
    it("renders nothing when closed", () => {
        const { container } = render(
            <ContextualHelp open={false} topic={TOPIC} lang="en" onClose={vi.fn()} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows a fallback message when no topic is written for the tab", () => {
        render(<ContextualHelp open topic={null} lang="en" onClose={vi.fn()} />);
        expect(screen.getByText("No help written for this tab yet.")).toBeInTheDocument();
    });

    it("renders the topic's heading, lead, points and tip", () => {
        render(<ContextualHelp open topic={TOPIC} lang="en" onClose={vi.fn()} />);
        expect(screen.getByText("Weighing")).toBeInTheDocument();
        expect(screen.getByText("Capture gross and tare.")).toBeInTheDocument();
        expect(screen.getByText("Stable")).toBeInTheDocument();
        expect(screen.getByText("The reading has settled.", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("Use Enter to move between fields.")).toBeInTheDocument();
    });

    it("uses the default title/close labels when none are given", () => {
        render(<ContextualHelp open topic={null} lang="en" onClose={vi.fn()} />);
        expect(screen.getByText("Help")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Close help" })).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
        const onClose = vi.fn();
        render(<ContextualHelp open topic={null} lang="en" onClose={onClose} />);
        fireEvent.click(screen.getByRole("button", { name: "Close help" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
