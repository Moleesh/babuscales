import { useEffect, useRef } from "react";

import type { HelpTopic } from "@i18n/helpTopics";
import { resolveLocalized } from "@i18n/types";

import styles from "./_styles/ContextualHelp.module.css";

export interface ContextualHelpLabels {
    title: string;
    close: string;
}

export interface ContextualHelpProps {
    open: boolean;
    topic: HelpTopic | null;
    lang: string;
    onClose: () => void;
    labels?: ContextualHelpLabels;
}

const DEFAULT_LABELS: ContextualHelpLabels = { title: "Help", close: "Close help" };

// The "?" drawer — the one place explanation is allowed to live, because
// screens themselves carry no prose (PLAN §11). `data-enter-scope` only
// appears while open, so Enter-as-Tab walks the drawer instead of the
// screen behind it, and reverts the moment it closes.
export const ContextualHelp = ({
    open,
    topic,
    lang,
    onClose,
    labels = DEFAULT_LABELS,
}: ContextualHelpProps) => {
    const drawerRef = useRef<HTMLElement>(null);

    // Not a backdrop-modal (aria-modal="false" — the mock never blocked the
    // screen behind it), so "close on outside click" has to be a document
    // listener rather than AppModal's backdrop-click trick. `data-help-toggle`
    // on the "?" button (App.tsx's TopBarActions) is excluded here so
    // clicking it to close doesn't first close-then-reopen via its own
    // onClick toggle.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (drawerRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest("[data-help-toggle]")) return;
            onClose();
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <aside ref={drawerRef} className={styles.drawer} role="dialog" aria-modal="false" data-enter-scope>
            <header className={styles.header}>
                <span className="lbl">{labels.title}</span>
                <span className={styles.push}>
                    <button className="iconbtn" aria-label={labels.close} onClick={onClose}>
                        ✕
                    </button>
                </span>
            </header>
            <div className={styles.body}>
                {topic ? (
                    <>
                        <h4 className={styles.heading}>{resolveLocalized(topic.Heading, lang)}</h4>
                        <p className={styles.lead}>{resolveLocalized(topic.Lead, lang)}</p>
                        <ul className={styles.points}>
                            {topic.Points.map((point, i) => (
                                <li key={i}>
                                    <b>{resolveLocalized(point.Term, lang)}</b> —{" "}
                                    {resolveLocalized(point.Detail, lang)}
                                </li>
                            ))}
                        </ul>
                        <p className={styles.tip}>{resolveLocalized(topic.Tip, lang)}</p>
                    </>
                ) : (
                    <p className={styles.lead}>No help written for this tab yet.</p>
                )}
            </div>
        </aside>
    );
};
