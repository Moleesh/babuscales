import type { SlipData } from "@engines/print";

import styles from "./SlipA4.module.css";

// The same fictional site identity already hardcoded in App.tsx's
// `siteLabel` — there is no site-profile Setting yet (app/README.md known
// gap), so this and that prop are the one place it lives, kept in sync by
// hand until a real Settings pane owns it.
const SITE_NAME = "SRI LAKSHMI BLUE METALS";
const SITE_ADDRESS = "Kottaram Road, Nagercoil 629001 · GSTIN 33ABCDE1234F1Z5";

export interface SlipA4Props {
    data: SlipData;
}

// Ported from the mock's `ticketA4` — real JSX rather than an HTML string,
// so React escapes every field automatically instead of needing the mock's
// own `esc()` calls. Deliberately drops the mock's "Verify: babuscale.app/v/…"
// footer line: that URL doesn't resolve to anything real (no QR-verification
// hosting yet — app/README.md known gap), and printing a dead link on an
// actual business document would be worse than the mock's own fake demo copy.
export const SlipA4 = ({ data }: SlipA4Props) => (
    <div className={styles.paper}>
        <div className={styles.head}>
            <div>
                <div className={styles.site}>{SITE_NAME}</div>
                <div className={styles.addr}>{SITE_ADDRESS}</div>
            </div>
            <div className={styles.no}>
                <div className={styles.noValue}>{data.TicketNo}</div>
                <div className={styles.copy}>{data.Copy || "ORIGINAL"}</div>
            </div>
        </div>
        <div className={styles.grid}>
            <div>
                <b>Vehicle</b> {data.VehicleNo}
            </div>
            <div>
                <b>Challan</b> {data.ChallanNo}
            </div>
            <div>
                <b>Party</b> {data.Party}
            </div>
            <div>
                <b>Material</b> {data.Material}
            </div>
            <div>
                <b>Tare at</b> {data.TareAt}
            </div>
            <div>
                <b>Gross at</b> {data.GrossAt}
            </div>
        </div>
        <div className={styles.weights}>
            <div>
                TARE
                <b>{data.TareKg}</b>kg
            </div>
            <div>
                GROSS
                <b>{data.GrossKg}</b>kg
            </div>
            <div>
                NET
                <b>{data.NetKg}</b>kg
            </div>
        </div>
        <div className={styles.grid}>
            <div>
                <b>Charge</b> {data.Charge}
            </div>
            <div>
                <b>Operator</b> {data.Operator}
            </div>
        </div>
        <div className={styles.footer}>
            <span>Printed {new Date().toLocaleString()}</span>
            <span>Signature</span>
        </div>
    </div>
);
