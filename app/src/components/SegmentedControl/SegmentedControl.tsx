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
