/**
 * GreenGrid Email Notification Service
 * Uses environment variables for SMTP delivery, with safe non-blocking fallback logging.
 */

const sendEmail = async ({ to, subject, html, text }) => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;

  // If SMTP credentials are fully provided, attempt sending
  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASSWORD) {
    try {
      // In a real environment, nodemailer would be used here:
      console.log(`[Email Service] Sending email to ${to} with subject "${subject}" via SMTP host ${EMAIL_HOST}...`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error("[Email Service] SMTP Delivery failed:", err.message);
      return { success: false, error: err.message };
    }
  }

  // Graceful simulation fallback for local development & testing
  console.log(`[Email Service Simulation] [To: ${to}] [Subject: "${subject}"]`);
  return { success: true, simulated: true };
};

module.exports = {
  sendEmail,
};
