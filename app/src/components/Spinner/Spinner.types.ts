export interface SpinnerProps {
    /** `sm` sits inline next to text (a button, a table cell); `md` is the default standalone size; `lg` is for a screen-level loading block. */
    size?: "sm" | "md" | "lg";
    /** Announced to screen readers — every spinner is a status region, never a bare decorative element. */
    label: string;
}
