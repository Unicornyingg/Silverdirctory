type VerificationEmailParams = {
  nurseName: string;
  toEmail: string;
};

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

export async function sendNurseVerifiedEmail({
  nurseName,
  toEmail,
}: VerificationEmailParams) {
  const { apiKey, fromEmail, replyTo } = getEmailConfig();

  const subject = "Your nurse profile has been verified";
  const text = [
    `Hi ${nurseName},`,
    "",
    "Your nursing profile has been verified and is now listed on our caregiver directory.",
    "",
    "Thank you,",
    "Caregiver Network",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#12243a">
      <p>Hi ${nurseName},</p>
      <p>Your nursing profile has been verified and is now listed on our caregiver directory.</p>
      <p>Thank you,<br/>Caregiver Network</p>
    </div>
  `;

  const payload = {
    from: fromEmail,
    to: toEmail,
    subject,
    text,
    html,
    reply_to: replyTo || undefined,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const failureText = await response.text();
    throw new Error(
      `Verification email failed (${response.status}): ${failureText.slice(0, 160)}`
    );
  }
}
