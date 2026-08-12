import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./_styles/Button.module.css";

export type ButtonVariant = "default" | "primary" | "danger";
export type ButtonSize = "default" | "large";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
    variant?: ButtonVariant;
    /** The mock's `#btnCap` override (min-height 64px, larger type) — the one headline action per screen, never ad hoc CSS. */
    size?: ButtonSize;
    /** A small line under the label — e.g. "Waiting for a stable reading" under "Capture Tare". */
    caption?: ReactNode;
    children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
    default: undefined,
    primary: styles.primary,
    danger: styles.danger,
};

const SIZE_CLASS: Record<ButtonSize, string | undefined> = {
    default: undefined,
    large: styles.large,
};

// Every button in the app — capture, save, print, cancel — is this one
// component (PLAN §10). Enter-as-Tab (PLAN §13) walks buttons the same way
// it walks fields; nothing here opts out of that, it is plain <button>.
export const Button = ({
    variant = "default",
    size = "default",
    caption,
    children,
    ...rest
}: ButtonProps) => (
    <button
        className={[styles.btn, VARIANT_CLASS[variant], SIZE_CLASS[size]].filter(Boolean).join(" ")}
        {...rest}
    >
        <span>{children}</span>
        {caption ? <small className={styles.caption}>{caption}</small> : null}
    </button>
);
