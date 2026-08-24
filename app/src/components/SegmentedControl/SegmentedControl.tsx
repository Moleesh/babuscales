import styles from "./_styles/SegmentedControl.module.css";

export interface SegmentedOption<Value extends string> {
    value: Value;
    label: string;
    disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string> {
    options: SegmentedOption<Value>[];
    value: Value;
    onChange: (value: Value) => void;
    /** Larger text/padding — the mock's ".segbar.big", used for Settings' section switcher. */
    size?: "default" | "big";
    ariaLabel: string;
}

// A row of mutually-exclusive buttons — which master kind, which settings
// pane, which report view. Ported from the mock's ".segbar".
export const SegmentedControl = <Value extends string>({
    options,
    value,
    onChange,
    size = "default",
    ariaLabel,
}: SegmentedControlProps<Value>) => (
    <div
        className={`${styles.bar} ${size === "big" ? styles.big : ""}`}
        role="group"
        aria-label={ariaLabel}
        // A mutually-exclusive choice, not a step in a linear entry flow —
        // without this, Enter after the last ticket field used to land on
        // the Tare/Gross toggle instead of jumping straight to Capture
        // (task: "enter should jump to capture, not tab through other
        // controls"). Mouse/Tab access is unaffected, only the Enter-walk.
        data-enter-skip
    >
        {options.map((option) => (
            <button
                key={option.value}
                type="button"
                aria-pressed={option.value === value}
                disabled={option.disabled}
                onClick={() => onChange(option.value)}
            >
                {option.label}
            </button>
        ))}
    </div>
);
