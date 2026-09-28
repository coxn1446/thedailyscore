/**
 * Shared mailer. Sends when EMAIL_ADDRESS and EMAIL_PASSWORD are set.
 * Unconfigured or transport errors skip send and do not throw.
 */
const nodemailer = require('nodemailer');

const isEmailConfigured = () =>
  Boolean(
    typeof process.env.EMAIL_ADDRESS === 'string' &&
      process.env.EMAIL_ADDRESS.trim() &&
      typeof process.env.EMAIL_PASSWORD === 'string' &&
      process.env.EMAIL_PASSWORD.trim()
  );

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject) {
    return { skipped: true };
  }
  if (!isEmailConfigured()) {
    console.warn('Email not configured; skipping send.', { to, subject });
    return { skipped: true };
  }
  try {
    const from = process.env.EMAIL_ADDRESS.trim();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: from,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({
      from,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    });
    return { skipped: false };
  } catch (err) {
    console.error('Email send failed; continuing.', {
      to,
      subject,
      error: err?.message || String(err),
    });
    return { skipped: true, error: true };
  }
};

module.exports = { isEmailConfigured, sendEmail };
