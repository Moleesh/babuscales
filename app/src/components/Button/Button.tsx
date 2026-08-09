import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "default" | "primary" | "danger";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
    variant?: ButtonVariant;
    /** A small line under the label — e.g. "Waiting for a stable reading" under "Capture Tare". */
    caption?: ReactNode;
    children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
    default: undefined,
    primary: styles.primary,
    danger: styles.danger,
};

// Every button in the app — capture, save, print, cancel — is this one
// component (PLAN §10). Enter-as-Tab (PLAN §13) walks buttons the same way
// it walks fields; nothing here opts out of that, it is plain <button>.
export const Button = ({ variant = "default", caption, children, ...rest }: ButtonProps) => (
    <button className={[styles.btn, VARIANT_CLASS[variant]].filter(Boolean).join(" ")} {...rest}>
        <span>{children}</span>
        {caption ? <small className={styles.caption}>{caption}</small> : null}
    </button>
);
