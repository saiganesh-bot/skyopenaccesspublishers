import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const isSmtpConfigured = Boolean(
  env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from
);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    })
  : null;

let didWarnSmtpMissing = false;
const senderAddress = env.smtp.from || env.smtp.user;

const ensureTransporter = () => {
  if (!transporter && !didWarnSmtpMissing) {
    // eslint-disable-next-line no-console
    console.warn("SMTP is not configured. Email delivery is disabled.");
    didWarnSmtpMissing = true;
  }
  return transporter;
};

const statusText = {
  received: "Received",
  under_review: "Under Review",
  accepted: "Accepted",
  published: "Published"
};

export const sendSubmissionStatusEmail = async ({ to, authorName, title, status }) => {
  if (!statusText[status]) return;

  const smtpTransport = ensureTransporter();
  if (!smtpTransport) return;

  const subject = `Manuscript ${statusText[status]}: ${title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1d1d1d;">
      <h2>Journal Submission Update</h2>
      <p>Dear ${authorName},</p>
      <p>Your manuscript <strong>${title}</strong> status has been updated to <strong>${statusText[status]}</strong>.</p>
      <p>Thank you for publishing with us.</p>
      <p style="margin-top: 20px;">Regards,<br/>Editorial Team</p>
    </div>
  `;

  await smtpTransport.sendMail({
    from: senderAddress,
    to,
    subject,
    html
  });
};

export const sendAdminVerificationEmail = async ({ to, adminName, code }) => {
  const smtpTransport = ensureTransporter();
  if (!smtpTransport) return false;

  try {
    await smtpTransport.sendMail({
      from: senderAddress,
      to,
      subject: "Verify your admin Gmail",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1d1d1d;">
          <h2>Admin Email Verification</h2>
          <p>Hello ${adminName},</p>
          <p>Your verification code is <strong>${code}</strong>.</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to send admin verification email: ${err.message}`);
    return false;
  }
};

export const sendAdminTwoFactorCodeEmail = async ({ to, adminName, code }) => {
  const smtpTransport = ensureTransporter();
  if (!smtpTransport) return false;

  try {
    await smtpTransport.sendMail({
      from: senderAddress,
      to,
      subject: "Your admin login verification code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1d1d1d;">
          <h2>Two-Factor Authentication</h2>
          <p>Hello ${adminName},</p>
          <p>Your one-time login code is <strong>${code}</strong>.</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to send admin 2FA email: ${err.message}`);
    return false;
  }
};
