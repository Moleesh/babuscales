import { buildQrDataUri } from "@engines/print";
import type { SlipData } from "@engines/print";

import styles from "./SlipA4.module.css";

// The same fictional site identity already hardcoded in App.tsx's
// `siteLabel` — there is no site-profile Setting yet (app/README.md known
// gap), so this and that prop are the one place it lives, kept in sync by
// hand until a real Settings pane owns it.
const SITE_NAME = "SRI LAKSHMI BLUE METALS";
const SITE_ADDRESS = "Babulens Enterprises, Nagercoil";

export interface SlipA4Props {
    data: SlipData;
}

// The two repeated row shapes in the slip's grids — "label value" and the
// TARE/GROSS/NET boxes — pulled out so the six-field/three-box blocks below
// read as data, not six/three near-identical hand-written divs.
const SlipField = ({ label, value }: { label: string; value: string }) => (
    <div>
        <b>{label}</b> {value}
    </div>
);

const SlipWeightBox = ({ label, kg }: { label: string; kg: string }) => (
    <div>
        {label}
        <b>{kg}</b>kg
    </div>
);

// Ported from the mock's `ticketA4` — real JSX rather than an HTML string,
// so React escapes every field automatically instead of needing the mock's
// own `esc()` calls. The mock's own "Verify: babuscales.app/v/…" footer line
// was dropped for the longest part of this build (that URL didn't resolve to
// anything real) — now that @engines/verification's local server exists
// (task #33), it's back as a real, scannable QR pointing at this exact
// ticket's page, and only when data.VerifyUrl is actually set: a ticket
// printed before it's saved, or with the integration off, gets no footer
// line at all rather than a dead link.
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
            <SlipField label="Vehicle" value={data.VehicleNo} />
            <SlipField label="Challan" value={data.ChallanNo} />
            <SlipField label="Party" value={data.Party} />
            <SlipField label="Material" value={data.Material} />
            <SlipField label="Tare at" value={data.TareAt} />
            <SlipField label="Gross at" value={data.GrossAt} />
        </div>
        <div className={styles.weights}>
            <SlipWeightBox label="TARE" kg={data.TareKg} />
            <SlipWeightBox label="GROSS" kg={data.GrossKg} />
            <SlipWeightBox label="NET" kg={data.NetKg} />
        </div>
        <div className={styles.grid}>
            <SlipField label="Charge" value={data.Charge} />
            <SlipField label="Operator" value={data.Operator} />
        </div>
        <div className={styles.footer}>
            <span>Printed {new Date().toLocaleString()}</span>
            {data.VerifyUrl && (
                <span className={styles.verify}>
                    <img
                        className={styles.qr}
                        src={buildQrDataUri(data.VerifyUrl)}
                        alt="Scan to verify this weighment"
                        width={40}
                        height={40}
                    />
                    Verify: {data.VerifyUrl}
                </span>
            )}
            <span>Signature</span>
        </div>
    </div>
);
