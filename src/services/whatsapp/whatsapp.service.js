import axios from "axios";

const API_VERSION = process.env.WHATSAPP_API_VERSION;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const getApiUrl = () => {
  if (!API_VERSION) {
    throw new Error("WHATSAPP_API_VERSION is missing");
  }

  if (!PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is missing");
  }

  return `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
};

/**
 * Send an approved WhatsApp template message through Meta's
 * WhatsApp Cloud API.
 *
 * This service is intentionally unaware of matches, users,
 * notifications, or application-specific business logic.
 */
export const sendWhatsAppTemplate = async ({
  phone,
  templateName,
  languageCode = "en_US",
  parameters = [],
}) => {
  if (!phone) {
    return {
      sent: false,
      reason: "NO_PHONE",
    };
  }

  if (!templateName) {
    throw new Error("WhatsApp template name is required");
  }

  if (!ACCESS_TOKEN) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is missing");
  }

  const bodyParameters = parameters.map((value) => ({
    type: "text",
    text: String(value ?? ""),
  }));

  try {
    const response = await axios.post(
      getApiUrl(),
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: "body",
              parameters: bodyParameters,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      },
    );

    return {
      sent: true,
      messageId: response.data?.messages?.[0]?.id ?? null,
    };
  } catch (error) {
    const status = error.response?.status ?? null;
    const metaError = error.response?.data?.error;

    console.error("[WhatsApp] Template message failed", {
      status,
      code: metaError?.code ?? null,
      type: metaError?.type ?? null,
      message: metaError?.message ?? error.message,
      templateName,
    });

    return {
      sent: false,
      reason: "WHATSAPP_API_ERROR",
      status,
      errorCode: metaError?.code ?? null,
      errorMessage: metaError?.message ?? error.message,
    };
  }
};
