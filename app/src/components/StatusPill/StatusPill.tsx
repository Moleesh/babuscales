import { formatWeightKg } from "@constants/numberFormat";

import styles from "./StatusPill.module.css";

export interface StatusPillLabels {
    tare: string;
    gross: string;
    net: string;
}

export interface StatusPillProps {
    tareKg?: number | null;
    grossKg?: number | null;
    /**
     * Task #46 — optional, so every caller from before multi-gross existed
     * keeps working unchanged. Pass the ticket's own `DerivedWeights.netKg`
     * (@db/ticketBody) when it's available: with more than one Gross
     * capture, `netKg` is the sum of each load's own net, not
     * `grossKg - tareKg` — the fallback below only holds for the
     * single-gross case.
     */
    netKg?: number | null;
    /** Struck through, faded — a cancellation is a flag, not a status (PLAN §7.4). */
    cancelled?: boolean;
    labels?: StatusPillLabels;
}

const DEFAULT_LABELS: StatusPillLabels = { tare: "Tare", gross: "Gross", net: "Net" };

interface SegmentProps {
    label: string;
    kg: number | null;
    net?: boolean;
}

const Segment = ({ label, kg, net }: SegmentProps) => {
    const on = kg !== null && kg !== undefined;
    const className = [styles.segment, on && styles.on, net && styles.net]
        .filter(Boolean)
        .join(" ");
    return (
        <i className={className}>
            {label}
            <b className={styles.value}>{on ? formatWeightKg(kg) : "—"}</b>
        </i>
    );
};

// The one status: a ticket's state is its tare, its gross, and the net they
// produce — nothing named, nothing to keep in sync (PLAN §7.4). Rendered by
// this one component everywhere a ticket's status appears.
export const StatusPill = ({
    tareKg,
    grossKg,
    netKg,
    cancelled,
    labels = DEFAULT_LABELS,
}: StatusPillProps) => {
    const tare = tareKg ?? null;
    const gross = grossKg ?? null;
    const net =
        netKg !== undefined
            ? (netKg ?? null)
            : tare !== null && gross !== null
              ? Math.abs(gross - tare)
              : null;

    return (
        <span className={`${styles.pill} ${cancelled ? styles.cancelled : ""}`}>
            <Segment label={labels.tare} kg={tare} />
            <Segment label={labels.gross} kg={gross} />
            <Segment label={labels.net} kg={net} net />
        </span>
    );
};
