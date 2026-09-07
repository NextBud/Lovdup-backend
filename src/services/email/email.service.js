import { resend } from "./resend.client.js";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

if (!FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is missing");
}

export const sendEmail = async ({
  to,
  subject,
  html,
  text = null,
  idempotencyKey = null,
}) => {
  if (!to) {
    return {
      sent: false,
      reason: "NO_EMAIL",
    };
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!html) {
    throw new Error("Email HTML content is required");
  }

  try {
    const options = idempotencyKey ? { idempotencyKey } : undefined;

    const { data, error } = await resend.emails.send(
      {
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
      },
      options,
    );

    if (error) {
      console.error("[Email] Resend API error", {
        to,
        subject,
        error,
      });

      return {
        sent: false,
        reason: "RESEND_API_ERROR",
        error,
      };
    }

    return {
      sent: true,
      messageId: data?.id ?? null,
    };
  } catch (error) {
    console.error("[Email] Unexpected error", {
      to,
      subject,
      error: error.message,
    });

    return {
      sent: false,
      reason: "EMAIL_SERVICE_ERROR",
      errorMessage: error.message,
    };
  }
};
