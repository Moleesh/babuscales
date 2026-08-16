import { useVerificationUrl } from "@engines/verification";
import type { SettingsBody } from "@features/settings";

import type { UseWeighingTicket } from "../useWeighingTicket";

// The printed slip's own QR points at this ticket's page on the
// local verification server (@engines/verification), null until the ticket
// has a DocId (a fresh, unsaved ticket has nothing to verify yet) or while
// the server itself is off/unavailable.
export const useTicketVerifyUrl = (settings: SettingsBody, ticket: UseWeighingTicket): string | null => {
    const verifyBase = useVerificationUrl(settings.Integrations.qr);
    return verifyBase && ticket.docId ? `${verifyBase}/v/${ticket.docId}` : null;
};
