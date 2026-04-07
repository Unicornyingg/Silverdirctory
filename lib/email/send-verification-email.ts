type VerificationEmailParams = {
  nurseName: string;
  toEmail: string;
};

type RejectionEmailParams = {
  nurseName: string;
  toEmail: string;
  reason: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.VERIFICATION_FROM_EMAIL;
  const replyTo = process.env.VERIFICATION_REPLY_TO_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Auto email is not configured. Add RESEND_API_KEY and VERIFICATION_FROM_EMAIL to your environment."
    );
  }

  return { apiKey, fromEmail, replyTo };
}

async function sendTransactionalEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const { apiKey, fromEmail, replyTo } = getEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    const failureText = await response.text();
    throw new Error(
      `Verification email failed (${response.status}): ${failureText.slice(0, 160)}`
    );
  }
}

export async function sendNurseVerifiedEmail({
  nurseName,
  toEmail,
}: VerificationEmailParams) {
  const safeName = escapeHtml(nurseName);
  const subject = "Licensed Nurse tag approved";
  const text = [
    `Hi ${nurseName},`,
    "",
    "Your nursing licence was approved by admin.",
    "Your public profile now shows the Licensed Nurse tag.",
    "",
    "Thank you,",
    "Silver Directory",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#12243a">
      <p>Hi ${safeName},</p>
      <p>Your nursing licence was approved by admin.</p>
      <p>Your public profile now shows the <strong>Licensed Nurse</strong> tag.</p>
      <p>Thank you,<br/>Silver Directory</p>
    </div>
  `;

  await sendTransactionalEmail({
    to: toEmail,
    subject,
    text,
    html,
  });
}

export async function sendNurseRejectedEmail({
  nurseName,
  toEmail,
  reason,
}: RejectionEmailParams) {
  const sanitizedReason = reason.trim() || "Your uploaded nursing licence could not be approved.";
  const safeName = escapeHtml(nurseName);
  const safeReason = escapeHtml(sanitizedReason);
  const subject = "Nursing licence review update";
  const text = [
    `Hi ${nurseName},`,
    "",
    "We reviewed your nursing licence submission but could not approve it.",
    `Reason: ${sanitizedReason}`,
    "",
    "Your profile remains a normal caregiver profile.",
    "You can upload a corrected licence document anytime from your dashboard.",
    "",
    "Thank you,",
    "Silver Directory",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#12243a">
      <p>Hi ${safeName},</p>
      <p>We reviewed your nursing licence submission but could not approve it.</p>
      <p><strong>Reason:</strong> ${safeReason}</p>
      <p>Your profile remains a normal caregiver profile.</p>
      <p>You can upload a corrected licence document anytime from your dashboard.</p>
      <p>Thank you,<br/>Silver Directory</p>
    </div>
  `;

  await sendTransactionalEmail({
    to: toEmail,
    subject,
    text,
    html,
  });
}
