type InquiryEmailParams = {
  caregiverName: string;
  caregiverEmail: string;
  caregiverLocation: string;
  senderName: string;
  senderEmail: string;
  contactNumber: string;
  message: string;
};

function getInquiryEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.INQUIRY_FROM_EMAIL || process.env.VERIFICATION_FROM_EMAIL;
  const replyTo = process.env.VERIFICATION_REPLY_TO_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Inquiry email is not configured. Add RESEND_API_KEY and INQUIRY_FROM_EMAIL (or VERIFICATION_FROM_EMAIL)."
    );
  }

  return { apiKey, fromEmail, replyTo };
}

export async function sendCaregiverInquiryEmail({
  caregiverName,
  caregiverEmail,
  caregiverLocation,
  senderName,
  senderEmail,
  contactNumber,
  message,
}: InquiryEmailParams) {
  const { apiKey, fromEmail, replyTo } = getInquiryEmailConfig();

  const subject = `New care inquiry for ${caregiverName}`;
  const text = [
    `Hi ${caregiverName},`,
    "",
    `A family reached out through Golden Directory for care support in ${caregiverLocation}.`,
    "",
    `Name: ${senderName}`,
    `Email: ${senderEmail}`,
    `Phone / WhatsApp: ${contactNumber}`,
    "",
    "Care request details:",
    message,
    "",
    "You can contact them directly to discuss terms and schedule.",
    "",
    "Golden Directory",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#12243a">
      <p>Hi ${caregiverName},</p>
      <p>A family reached out through Golden Directory for care support in <strong>${caregiverLocation}</strong>.</p>
      <p>
        <strong>Name:</strong> ${senderName}<br/>
        <strong>Email:</strong> ${senderEmail}<br/>
        <strong>Phone / WhatsApp:</strong> ${contactNumber}
      </p>
      <p><strong>Care request details:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
      <p>You can contact them directly to discuss terms and schedule.</p>
      <p>Golden Directory</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: caregiverEmail,
      subject,
      text,
      html,
      reply_to: replyTo || senderEmail,
    }),
  });

  if (!response.ok) {
    const failureText = await response.text();
    throw new Error(
      `Inquiry email failed (${response.status}): ${failureText.slice(0, 160)}`
    );
  }
}
