import { useEffect, useState } from "react";

import { createSmsSource } from "@engines/sms/createSmsSource";

import type { ConnectionsConfig } from "../settingsSchema";
import { useFlashMessage } from "./useFlashMessage";

export interface UseSmsDeliveryArgs {
    conn: ConnectionsConfig;
}

export interface UseSmsDelivery {
    ports: string[];
    refreshing: boolean;
    refreshPorts: () => void;
    testTo: string;
    setTestTo: (value: string) => void;
    sending: boolean;
    flash: string | null;
    sendTest: () => Promise<void>;
}

// Split out of SmsCard (over the line budget — docs/CodingStandards.md) —
// the port-scan/test-send logic, unchanged from the inline version it
// replaces. AT commands over a local serial port need no auth, so unlike
// EmailCard there is no password to store.
export const useSmsDeliveryActions = ({ conn }: UseSmsDeliveryArgs): UseSmsDelivery => {
    const [sms] = useState(() => createSmsSource());
    const [ports, setPorts] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [sending, setSending] = useState(false);
    const { flash, showFlash } = useFlashMessage();

    const refreshPorts = (): void => {
        setRefreshing(true);
        void sms
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    };

    useEffect(() => {
        refreshPorts();
        // refreshPorts is stable enough for this — same one-shot-on-mount
        // shape as ConnectionsPane's own port-scan effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sms]);

    const sendTest = async (): Promise<void> => {
        const to = testTo.trim();
        if (!to) return;
        setSending(true);
        try {
            const result = await sms.send({
                port: conn.GsmPort,
                baud: conn.GsmBaud,
                to,
                message: "BabuScales - test SMS. If this arrived, this GSM modem configuration works.",
            });
            showFlash(result.Ok ? `Test SMS sent to ${to}` : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return { ports, refreshing, refreshPorts, testTo, setTestTo, sending, flash, sendTest };
};
