import { formatDateTimeInFmt } from "@constants/numberFormat";
import { buildQrDataUri } from "@engines/print";
import type { SlipData } from "@engines/print";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SlipA4.module.css";

// The same fictional site identity already hardcoded in App.tsx's
// `siteLabel` — there is no site-profile Setting yet (app/README.md known
// gap), so this and that prop are the one place it lives, kept in sync by
// hand until a real Settings pane owns it.
const SITE_NAME = "BABULENS ENTERPRISE";
const SITE_ADDRESS = "Nagercoil · 9789597007";

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

// `kg` is already the fully-formatted weight-with-unit string
// (SlipData.TareKg/GrossKg/NetKg, via buildSlipData's formatWeightIn) — no
// literal "kg" suffix here, or a "t" display unit would render "1.5 t kg".
const SlipWeightBox = ({ label, kg }: { label: string; kg: string }) => (
    <div>
        {label}
        <b>{kg}</b>
    </div>
);

// Task #46's itemised per-load breakdown — pulled out of SlipA4 itself
// (over the line budget — docs/CodingStandards.md) rather than inlined;
// SlipA4 only ever renders it when there's more than one load to itemise.
const SlipLoadsTable = ({ loads }: { loads: SlipData["GrossLoads"] }) => (
    <div className={styles.loads}>
        <table>
            <thead>
                <tr>
                    <th>Load</th>
                    <th>Gross</th>
                    <th>At</th>
                </tr>
            </thead>
            <tbody>
                {loads.map((load, index) => (
                    // Index as key is fine here — loads carry no id of their own, are never reordered, and this list only ever grows top-to-bottom during capture.
                    <tr key={`${load.At}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{load.Kg}</td>
                        <td>{load.At}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Ported from the mock's `ticketA4` — real JSX rather than an HTML string,
// so React escapes every field automatically instead of needing the mock's
// own `esc()` calls. The mock's own "Verify: babuscales.app/v/…" footer line
// was dropped for the longest part of this build (that URL didn't resolve to
// anything real) — now that @engines/verification's local server exists,
// it's back as a real, scannable QR pointing at this exact
// ticket's page, and only when data.VerifyUrl is actually set: a ticket
// printed before it's saved, or with the integration off, gets no footer
// line at all rather than a dead link.
export const SlipA4 = ({ data }: SlipA4Props) => {
    const { lang } = useTranslation();
    const { settings } = useSettings();
    return (
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
            {data.GrossLoads.length > 1 && <SlipLoadsTable loads={data.GrossLoads} />}
            <div className={styles.grid}>
                <SlipField label="Charge" value={data.Charge} />
                <SlipField label="Operator" value={data.Operator} />
            </div>
            <div className={styles.footer}>
                <span>
                    Printed{" "}
                    {formatDateTimeInFmt(
                        new Date(),
                        lang,
                        settings.Formats.DateFmt,
                        settings.Formats.TimeFmt,
                    )}
                </span>
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
};
