import * as emailService from "./email.service.js";
import { EMAIL_TEMPLATES } from "./email.templates.js";

export const sendNewMatchEmail = async ({
  email,
  recipientName,
  matchedUserName,
  matchId = null,
  recipientId = null,
}) => {
  if (!email) {
    return {
      sent: false,
      reason: "NO_EMAIL",
      matchId,
      recipientId,
    };
  }

  const template = EMAIL_TEMPLATES.NEW_MATCH;

  const templateData = {
    recipientName,
    matchedUserName,
  };

  const result = await emailService.sendEmail({
    to: email,
    subject: template.subject,
    html: template.html(templateData),
    text: template.text(templateData),

    // Prevent accidental duplicate delivery when the same
    // match event is retried.
    idempotencyKey: matchId ? `lovdup:new-match:${matchId}:${email}` : null,
  });

  return {
    ...result,
    matchId,
    recipientId,
  };
};
