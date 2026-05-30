import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import qrcode from "qrcode";
import speakeasy from "speakeasy";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendAdminVerificationEmail
} from "../utils/mailer.js";

const signToken = (userId) => jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const signTwoFactorChallenge = (userId) =>
  jwt.sign({ id: userId, purpose: "admin-totp" }, env.jwtSecret, { expiresIn: "10m" });

const isGmailAddress = (email = "") => /@gmail\.com$/i.test(email.trim());
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);
const generateTwoFactorSecret = (email) =>
  speakeasy.generateSecret({ name: `Sky Open Access (${email})` });

export const setupFirstAdmin = asyncHandler(async (req, res) => {
  const { setupKey, name, email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!env.adminSetupKey || setupKey !== env.adminSetupKey) {
    return res.status(403).json({ message: "Invalid setup key" });
  }

  if (!isGmailAddress(normalizedEmail)) {
    return res.status(400).json({ message: "Admin email must be a Gmail address" });
  }

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ message: "Admin already exists with this email" });
  }

  const verificationCode = generateOtpCode();
  const totpSecret = generateTwoFactorSecret(normalizedEmail);
  const admin = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: "admin",
    isEmailVerified: false,
    emailVerificationCodeHash: await bcrypt.hash(verificationCode, 10),
    emailVerificationCodeExpiresAt: otpExpiry(),
    twoFactorSecret: totpSecret.base32,
    twoFactorEnabled: true
  });

  const delivered = await sendAdminVerificationEmail({
    to: admin.email,
    adminName: admin.name,
    code: verificationCode
  });

  const qrCodeDataUrl = await qrcode.toDataURL(totpSecret.otpauth_url);

  res.status(201).json({
    message: delivered
      ? "Admin created. Verification code sent to Gmail."
      : "Admin created. SMTP is not configured, so verification email was not sent.",
    requiresEmailVerification: true,
    user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    devVerificationCode: delivered || process.env.NODE_ENV === "production" ? undefined : verificationCode,
    twoFactorSetup: {
      otpauthUrl: totpSecret.otpauth_url,
      qrCodeDataUrl
    }
  });
});

export const verifyAdminEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail })
    .select("+emailVerificationCodeHash +emailVerificationCodeExpiresAt isEmailVerified name email role");

  if (!user) {
    return res.status(404).json({ message: "Admin not found" });
  }

  if (user.isEmailVerified) {
    return res.status(200).json({ message: "Gmail already verified" });
  }

  if (!user.emailVerificationCodeHash || !user.emailVerificationCodeExpiresAt) {
    return res.status(400).json({ message: "Verification code is not available. Request a new code." });
  }

  if (new Date() > user.emailVerificationCodeExpiresAt) {
    return res.status(400).json({ message: "Verification code expired" });
  }

  const valid = await bcrypt.compare(String(code || ""), user.emailVerificationCodeHash);
  if (!valid) {
    return res.status(400).json({ message: "Invalid verification code" });
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationCodeExpiresAt = undefined;
  await user.save();

  res.status(200).json({ message: "Gmail verified successfully" });
});

export const resendAdminVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+emailVerificationCodeHash +emailVerificationCodeExpiresAt isEmailVerified name email role"
  );

  if (!user) {
    return res.status(404).json({ message: "Admin not found" });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ message: "Gmail is already verified" });
  }

  const verificationCode = generateOtpCode();
  user.emailVerificationCodeHash = await bcrypt.hash(verificationCode, 10);
  user.emailVerificationCodeExpiresAt = otpExpiry();
  await user.save();

  const delivered = await sendAdminVerificationEmail({
    to: user.email,
    adminName: user.name,
    code: verificationCode
  });

  res.status(200).json({
    message: delivered
      ? "Verification code sent"
      : "SMTP is not configured, so verification email was not sent.",
    devVerificationCode: delivered || process.env.NODE_ENV === "production" ? undefined : verificationCode
  });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password isEmailVerified name twoFactorEnabled twoFactorSecret"
  );
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.isEmailVerified === false) {
    const verificationCode = generateOtpCode();
    user.emailVerificationCodeHash = await bcrypt.hash(verificationCode, 10);
    user.emailVerificationCodeExpiresAt = otpExpiry();
    await user.save();

    const delivered = await sendAdminVerificationEmail({
      to: user.email,
      adminName: user.name,
      code: verificationCode
    });

    return res.status(403).json({
      message: delivered
        ? "Admin Gmail is not verified. Verification code was sent."
        : "Admin Gmail is not verified. Use resend verification or check SMTP.",
      requiresEmailVerification: true,
      devVerificationCode:
        delivered || process.env.NODE_ENV === "production" ? undefined : verificationCode
    });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(403).json({ message: "Two-factor is not enabled for this admin." });
  }

  res.status(200).json({
    message: "Enter the verification code from your authenticator app.",
    requiresTwoFactor: true,
    challengeToken: signTwoFactorChallenge(user._id)
  });
});

export const verifyAdminTwoFactor = asyncHandler(async (req, res) => {
  const { challengeToken, code } = req.body;

  if (!challengeToken) {
    return res.status(400).json({ message: "Missing two-factor challenge token" });
  }

  let decoded;
  try {
    decoded = jwt.verify(challengeToken, env.jwtSecret);
  } catch {
    return res.status(401).json({ message: "Invalid or expired challenge token" });
  }

  if (decoded.purpose !== "admin-totp") {
    return res.status(401).json({ message: "Invalid challenge token" });
  }

  const user = await User.findById(decoded.id).select(
    "+twoFactorSecret +twoFactorEnabled name email role"
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid challenge" });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ message: "Two-factor is not configured for this admin." });
  }

  const validCode = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: String(code || ""),
    window: 1
  });

  if (!validCode) {
    return res.status(400).json({ message: "Invalid two-factor code" });
  }

  const token = signToken(user._id);

  res.status(200).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});
