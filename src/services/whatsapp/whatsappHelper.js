import * as whatsappService from "./whatsapp.service.js";

const NEW_MATCH_TEMPLATE = "new_match";
const NEW_MATCH_LANGUAGE = "en_US";

/**
 * Normalize a phone number into the format expected by
 * WhatsApp Cloud API.
 *
 * Current application default:
 * Nigerian local numbers are converted from 0XXXXXXXXXX
 * to 234XXXXXXXXXX.
 */
const normalizeWhatsAppPhone = (phone) => {
  if (!phone) {
    return null;
  }

  const normalized = String(phone)
    .trim()
    .replace(/[^\d+]/g, "");

  if (!normalized) {
    return null;
  }

  // E.164 numbers must start with "+"
  // Example: +2348012345678
  if (normalized.startsWith("+")) {
    return normalized.slice(1);
  }

  // Already in international format without "+"
  // Example: 2348012345678
  return normalized;
};
/**
 * Send a new-match WhatsApp notification.
 *
 * This service contains match-specific business logic but does
 * not perform database queries. The caller should provide the
 * recipient's phone number.
 */
export const sendMatchWhatsApp = async ({
  phone,
  matchedUserName,
  matchId = null,
  recipientId = null,
}) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return {
      sent: false,
      reason: "NO_WHATSAPP_NUMBER",
      matchId,
      recipientId,
    };
  }

  const result = await whatsappService.sendWhatsAppTemplate({
    phone: normalizedPhone,
    templateName: NEW_MATCH_TEMPLATE,
    languageCode: NEW_MATCH_LANGUAGE,
    parameters: [matchedUserName || "Someone"],
  });

  return {
    ...result,
    matchId,
    recipientId,
  };
};
