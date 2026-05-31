const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

if (!GMAIL_USER || !GMAIL_PASSWORD) {
  console.warn('Gmail credentials not configured. Email notifications will be disabled.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASSWORD,
  },
});

const sendApprovalEmail = async (recipientEmail, userName, approvalLink) => {
  if (!GMAIL_USER || !GMAIL_PASSWORD) {
    console.warn('Skipping email send - Gmail not configured');
    return { success: true, skipped: true };
  }

  const mailOptions = {
    from: GMAIL_USER,
    to: recipientEmail,
    subject: 'New Admin Registration Request - Approval Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Admin Registration Request</h2>
        <p>A new admin has registered for the Auvia Admin System:</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${recipientEmail}</p>
        </div>

        <p>To approve this registration, click the link below:</p>

        <div style="margin: 30px 0;">
          <a href="${approvalLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Approve Registration
          </a>
        </div>

        <p style="color: #666; font-size: 12px;">
          Or copy and paste this link in your browser:<br>
          <code>${approvalLink}</code>
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

        <p style="color: #666; font-size: 12px;">
          This is an automated message from Auvia Admin System. Please do not reply to this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Approval email sent:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending approval email:', err);
    throw new Error(`Failed to send approval email: ${err.message}`);
  }
};

module.exports = {
  sendApprovalEmail,
};
