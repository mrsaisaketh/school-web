export const emailService = {
  async sendEmail({ to, subject, template, data }) {
    console.log(`[EMAIL SIMULATOR] Sending email to ${to} | Subject: ${subject} | Template: ${template}`);
    return { success: true, messageId: `msg_${Date.now()}` };
  },
};
