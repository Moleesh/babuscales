import { useVerificationServer } from "@engines/verification";

import type { IntegrationFixture, IntegrationKey, SettingsBody } from "../settingsSchema";

export interface UseIntegrationsActionsArgs {
    settings: SettingsBody;
    save: (next: SettingsBody) => Promise<void>;
    showFlash: (message: string) => void;
}

export interface UseIntegrationsActions {
    toggle: (key: IntegrationKey, name: string) => void;
    configure: (fixture: IntegrationFixture) => Promise<void>;
}

// Split out of IntegrationsCard (over the line budget — docs/CodingStandards.md)
// — the toggle/configure logic, unchanged from the inline version it
// replaces. Real for QR verification, e-mail and SMS — everything else
// stays the mock's own "here's where this would be configured" placeholder
// (app/README.md known gap). WhatsApp specifically will never join that
// list: PLAN §23 open item 5 flags it as "the only per-message cost", and
// task #44 (app/README.md item 31) recorded why there's no compliant free
// path to wire it to — Meta's Cloud API is paid, and the unofficial
// alternative violates WhatsApp's own Terms of Service.
export const useIntegrationsActions = ({
    settings,
    save,
    showFlash,
}: UseIntegrationsActionsArgs): UseIntegrationsActions => {
    const verificationServer = useVerificationServer();

    const toggle = (key: IntegrationKey, name: string): void => {
        const next = !settings.Integrations[key];
        void save({ ...settings, Integrations: { ...settings.Integrations, [key]: next } });
        showFlash(`${name} ${next ? "enabled" : "disabled"}`);
    };

    const configure = async (fixture: IntegrationFixture): Promise<void> => {
        if (fixture.key === "qr") {
            if (!settings.Integrations.qr) {
                showFlash("QR verification page — turn it on first to see its address");
                return;
            }
            const status = (await verificationServer.status()) ?? (await verificationServer.start());
            showFlash(
                status
                    ? `QR verification page — ${status.LanUrl ?? status.LoopbackUrl}`
                    : "QR verification page — desktop app only, not available in this build",
            );
            return;
        }
        if (fixture.key === "email") {
            showFlash("E-mail — SMTP host, port, username and password set below, not here");
            return;
        }
        if (fixture.key === "sms") {
            showFlash("SMS gateway — modem port and baud rate set below, not here");
            return;
        }
        showFlash(`${fixture.name} · ${fixture.config} — stored in the settings table`);
    };

    return { toggle, configure };
};
