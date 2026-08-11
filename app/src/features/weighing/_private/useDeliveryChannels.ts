import { useState } from "react";

import { createEmailSource } from "@engines/email/createEmailSource";
import type { EmailSource } from "@engines/email/types";
import { createSmsSource } from "@engines/sms/createSmsSource";
import type { SmsSource } from "@engines/sms/types";

export interface DeliveryChannels {
    email: EmailSource;
    sms: SmsSource;
}

// Tasks #42/#43 — no shared status to poll (see @engines/email's own
// comment), so these are created once here exactly like @engines/print's
// stateless helpers, not threaded through a Context.
export const useDeliveryChannels = (): DeliveryChannels => {
    const [email] = useState(() => createEmailSource());
    const [sms] = useState(() => createSmsSource());
    return { email, sms };
};
