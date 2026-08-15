import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";

export interface BoardFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of WebhookTallyBoardFields (over the line budget —
// docs/CodingStandards.md) — the host/port pair, unchanged from the inline
// version it replaces.
export const BoardFields = ({ settings, unlocked, onSave }: BoardFieldsProps) => {
    const board = settings.Board;
    const { t } = useTranslation();
    return (
        <FieldGrid columns={2}>
            <Field id="boardHost" label={t("settings.board.hostIp")}>
                <input
                    id="boardHost"
                    placeholder="192.168.1.50"
                    value={board.Host}
                    disabled={!unlocked}
                    autoComplete="off"
                    onChange={(event) => onSave({ ...settings, Board: { ...board, Host: event.target.value } })}
                />
            </Field>
            <Field id="boardPort" label={t("settings.port")}>
                <input
                    id="boardPort"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={board.Port}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Board: { ...board, Port: Number(event.target.value) || 23 } })
                    }
                />
            </Field>
        </FieldGrid>
    );
};
