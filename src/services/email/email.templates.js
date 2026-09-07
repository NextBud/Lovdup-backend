const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const EMAIL_TEMPLATES = {
  NEW_MATCH: {
    subject: "It's a match! ❤️",

    html: ({ recipientName, matchedUserName }) => {
      const safeRecipientName = escapeHtml(recipientName || "there");

      const safeMatchedUserName = escapeHtml(matchedUserName || "Someone");

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>It's a match!</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background: #f7f7f7;
              font-family: Arial, Helvetica, sans-serif;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
              "
            >
              <div
                style="
                  background: #ffffff;
                  border-radius: 12px;
                  padding: 40px;
                "
              >
                <h1
                  style="
                    margin: 0 0 24px;
                    font-size: 28px;
                  "
                >
                  It's a match! ❤️
                </h1>

                <p
                  style="
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hi ${safeRecipientName},
                </p>

                <p
                  style="
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  You matched with
                  <strong>${safeMatchedUserName}</strong>.
                </p>

                <p
                  style="
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Someone interesting is waiting for you on LovdUp.
                </p>

                <p
                  style="
                    margin-top: 32px;
                    font-size: 14px;
                    color: #666666;
                  "
                >
                  Open LovdUp to start your conversation.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    },

    text: ({ recipientName, matchedUserName }) => {
      return [
        `Hi ${recipientName || "there"},`,
        "",
        `You matched with ${matchedUserName || "Someone"}.`,
        "",
        "Open LovdUp to start your conversation.",
      ].join("\n");
    },
  },
};
