import { Card } from "@components/Card";
import { Field } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import type { BusinessInfo } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/BusinessPane.module.css";

// New default-open Settings pane — name/address/phone shown in
// the header's `siteLabel` (App.tsx) used to be a hardcoded string; this is
// the one place to edit it. Admin-gated like every other configuration
// pane (not "operator comfort" — see AppearancePane's own note on that
// distinction), writes through `save()` immediately, same as WeighingPane.
export const BusinessPane = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();

    const setField = (key: keyof BusinessInfo, value: string): void => {
        if (value === settings.Business[key]) return;
        void save({ ...settings, Business: { ...settings.Business, [key]: value } });
    };

    return (
        <div className={styles.grid}>
            <Card title={<span className="lbl">{t("settings.business.title")}</span>}>
                <div className={styles.form}>
                    <Field id="setBizName" label={t("settings.business.name")}>
                        <input
                            id="setBizName"
                            disabled={!unlocked}
                            defaultValue={settings.Business.Name}
                            key={settings.Business.Name}
                            autoComplete="off"
                            onBlur={(event) => setField("Name", event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                            }}
                        />
                    </Field>
                    <Field id="setBizAddress" label={t("settings.business.address")}>
                        <input
                            id="setBizAddress"
                            disabled={!unlocked}
                            defaultValue={settings.Business.Address}
                            key={settings.Business.Address}
                            autoComplete="off"
                            onBlur={(event) => setField("Address", event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                            }}
                        />
                    </Field>
                    <Field id="setBizPhone" label={t("settings.business.phone")}>
                        <input
                            id="setBizPhone"
                            disabled={!unlocked}
                            defaultValue={settings.Business.Phone}
                            key={settings.Business.Phone}
                            autoComplete="off"
                            onBlur={(event) => setField("Phone", event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                            }}
                        />
                    </Field>
                </div>
            </Card>
        </div>
    );
};
