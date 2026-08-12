import { Field, FieldGrid } from "@components/Field";

import type { SettingsBody } from "../settingsSchema";

export interface WebhookFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of WebhookTallyBoardFields (over the line budget —
// docs/CodingStandards.md) — the endpoint/secret pair, unchanged from the
// inline version it replaces.
export const WebhookFields = ({ settings, unlocked, onSave }: WebhookFieldsProps) => {
    const webhook = settings.Webhook;
    return (
        <FieldGrid columns={2}>
            <Field id="webhookEndpoint" label={{ en: "Endpoint URL", ta: "இறுதிமுனை URL" }}>
                <input
                    id="webhookEndpoint"
                    placeholder="https://example.com/hooks/babuscales"
                    value={webhook.Endpoint}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Webhook: { ...webhook, Endpoint: event.target.value } })
                    }
                />
            </Field>
            <Field id="webhookSecret" label={{ en: "Signing secret (optional)", ta: "கையொப்ப ரகசியம் (விருப்பம்)" }}>
                <input
                    id="webhookSecret"
                    type="password"
                    placeholder="Leave blank to send unsigned"
                    value={webhook.Secret}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Webhook: { ...webhook, Secret: event.target.value } })
                    }
                />
            </Field>
        </FieldGrid>
    );
};
