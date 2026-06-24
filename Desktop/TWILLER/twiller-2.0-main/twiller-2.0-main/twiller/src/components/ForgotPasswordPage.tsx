"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Eye, EyeOff, RefreshCw, Copy, Check, ArrowLeft,
  KeyRound, Mail, Phone, ShieldCheck, Lock, MessageSquare, Bell,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { useLanguage } from "@/context/LanguageContext";
import LoadingSpinner from "./loading-spinner";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "input" | "otp" | "reset" | "done" | "rateLimited";
type InputType = "email" | "phone";
type ContactType = "email" | "phone" | "both";
type OtpChannel = "email" | "mobile" | "both";

// ─── Password Generator ────────────────────────────────────────────────────────
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";

function generateStrongPassword(length = 14): string {
  const all = UPPERCASE + LOWERCASE;
  let pw =
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)] +
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
  for (let i = 2; i < length; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

function getStrength(pw: string) {
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
  const len = pw.length;
  let score = 0;
  if (len >= 8) score++;
  if (hasUpper && hasLower) score++;
  if (hasDigit) score++;
  if (hasSymbol) score++;
  if (len >= 14) score = Math.min(score + 1, 4);
  return Math.min(score, 4);
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "#f4212e", "#ffd400", "#00ba7c", "#1d9bf0"];

interface ForgotPasswordPageProps { onBack: () => void; }

export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const { t } = useLanguage();
  const [isInitializing, setIsInitializing] = useState(true);
  const [step, setStep] = useState<Step>("input");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  const [inputType, setInputType] = useState<InputType>("email");
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("both");
  const [identifier, setIdentifier] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // Dev mode: OTP shown on screen when no SMS/email gateway configured
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpCopied, setOtpCopied] = useState(false);

  const [newPassword, setNewPassword] = useState(() => generateStrongPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const strengthScore = getStrength(newPassword);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const copyDevOtp = async () => {
    if (!devOtp) return;
    try {
      await navigator.clipboard.writeText(devOtp);
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const regeneratePassword = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);
    setNewPassword(generateStrongPassword());
    setCopied(false);
  }, []);

  const validateIdentifier = (): boolean => {
    if (!identifier.trim()) {
      setError(inputType === "email" ? "Please enter your email address." : "Please enter your phone number.");
      return false;
    }
    if (inputType === "email" && !/\S+@\S+\.\S+/.test(identifier)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (inputType === "phone" && !/^\+\d{7,15}$/.test(identifier.trim())) {
      setError("Enter your phone number with country code in E.164 format (e.g. +91XXXXXXXXXX).");
      return false;
    }
    return true;
  };

  // ── Step 1: Submit identifier → backend sends OTP ────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateIdentifier()) return;
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/forgot-password", { identifier: identifier.trim(), channel: otpChannel });
      // Handle new response fields
      setMaskedContact(res.data.maskedContact || res.data.maskedEmail || identifier);
      setContactType(res.data.contactType || "email");
      setVerifiedEmail(res.data.email || identifier);
      // Dev mode: OTP exposed in response (no SMS/email gateway configured)
      setDevOtp(res.data.devOtp || null);
      setStep("otp");
      startResendCooldown();
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { error?: string; rateLimited?: boolean } } };
      if (axErr?.response?.status === 429 || axErr?.response?.data?.rateLimited) {
        setStep("rateLimited");
      } else {
        setError(axErr?.response?.data?.error || "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/forgot-password", { identifier: identifier.trim(), channel: otpChannel });
      setMaskedContact(res.data.maskedContact || res.data.maskedEmail || identifier);
      setContactType(res.data.contactType || "email");
      setDevOtp(res.data.devOtp || null);
      setOtp("");
      startResendCooldown();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr?.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP → backend issues resetToken ───────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim() || otp.trim().length !== 6) {
      setError(contactType === "phone"
        ? "Please enter the 6-digit code sent to your phone."
        : "Please enter the 6-digit code from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/forgot-password/verify-otp", {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });
      setResetToken(res.data.resetToken);
      setStep("reset");
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr?.response?.data?.error || "Incorrect code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 3: Set new password with resetToken ─────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (strengthScore < 2) {
      setError("Please choose a stronger password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axiosInstance.post("/forgot-password/reset", {
        identifier: identifier.trim(),
        resetToken,
        newPassword,
      });
      setStep("done");
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr?.response?.data?.error || "Failed to reset password. Please start over.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "520px",
    background: "#000",
    border: "1px solid #2f3336",
    borderRadius: "20px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(29,155,240,0.06)",
    overflow: "hidden",
    position: "relative",
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(29,155,240,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={cardStyle}>
        {/* Top accent bar */}
        <div style={{ height: "3px", background: "linear-gradient(90deg,#1d9bf0,#7856ff,#1d9bf0)", backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite" }} />

        <div style={{ padding: "32px 36px 36px" }}>
          {/* Back */}
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#71767b", background: "none", border: "none", cursor: "pointer", fontSize: "15px", padding: "4px 0", marginBottom: "24px", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e7e9ea")}
            onMouseLeave={e => (e.currentTarget.style.color = "#71767b")}
          >
            <ArrowLeft size={18} /><span>{t("Back to sign in")}</span>
          </button>

          {/* X Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            <svg viewBox="0 0 24 24" style={{ width: "36px", height: "36px", fill: "white" }}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>

          {isInitializing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "250px", gap: "16px" }}>
              <LoadingSpinner size="lg" />
              <p style={{ color: "#71767b", fontSize: "14px" }}>{t("loading_posts") || "Loading..."}</p>
            </div>
          ) : (
            <>
              {/* ── RATE LIMITED ── */}
              {step === "rateLimited" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(244,33,46,0.12)", border: "1px solid rgba(244,33,46,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg viewBox="0 0 24 24" style={{ width: "28px", height: "28px", fill: "#f4212e" }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z" /></svg>
              </div>
              <h1 style={{ color: "#e7e9ea", fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>{t("Limit Reached")}</h1>
              <p style={{ color: "#71767b", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px" }}>You can use this option only one time per day.</p>
              <button onClick={onBack} style={{ width: "100%", background: "#e7e9ea", color: "#000", fontWeight: "800", fontSize: "17px", padding: "13px", borderRadius: "9999px", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.background = "#e7e9ea")}
              >{t("Return to sign in")}</button>
            </div>
          )}

          {/* ── STEP 1: ENTER IDENTIFIER ── */}
          {step === "input" && (
            <>
              <h1 style={{ color: "#e7e9ea", fontSize: "28px", fontWeight: "800", marginBottom: "10px" }}>{t("Reset your password")}</h1>
              <p style={{ color: "#71767b", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
                {t("forgot_desc")}
              </p>

              {/* Input type toggle: Email / Phone */}
              <div style={{ display: "flex", background: "#0d0d0d", borderRadius: "12px", padding: "4px", marginBottom: "16px", border: "1px solid #2f3336", gap: "4px" }}>
                {(["email", "phone"] as InputType[]).map(type => (
                  <button key={type} onClick={() => { setInputType(type); setIdentifier(""); setError(""); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: "all 0.2s", background: inputType === type ? "#1d9bf0" : "transparent", color: inputType === type ? "#fff" : "#71767b" }}
                  >
                    {type === "email" ? <Mail size={14} /> : <Phone size={14} />}
                    {type === "email" ? t("email") : t("phone")}
                  </button>
                ))}
              </div>

              {/* OTP Channel selection */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ color: "#71767b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>Send OTP via</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {([
                    { id: "email" as OtpChannel, icon: Mail, label: "Email", color: "#1d9bf0" },
                    { id: "mobile" as OtpChannel, icon: Phone, label: "Mobile", color: "#25D366" },
                    { id: "both" as OtpChannel, icon: Bell, label: "Both", color: "#7856ff" },
                  ]).map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setOtpChannel(ch.id)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: "5px", padding: "10px 6px", borderRadius: "10px", border: "none", cursor: "pointer",
                        fontSize: "12px", fontWeight: "700", transition: "all 0.18s",
                        background: otpChannel === ch.id ? `${ch.color}18` : "#16181c",
                        color: otpChannel === ch.id ? ch.color : "#71767b",
                        boxShadow: otpChannel === ch.id ? `0 0 0 1.5px ${ch.color}60` : "0 0 0 1px #2f3336",
                        transform: otpChannel === ch.id ? "scale(1.03)" : "scale(1)",
                      }}
                    >
                      <ch.icon size={17} />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(244,33,46,0.08)", border: "1px solid rgba(244,33,46,0.25)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#f4212e", fontSize: "14px" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp}>
                <div style={{ position: "relative", marginBottom: "20px" }}>
                  <input
                    type={inputType === "email" ? "email" : "tel"}
                    placeholder=" "
                    id="forgot-identifier"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); if (error) setError(""); }}
                    disabled={isSubmitting}
                    style={{ width: "100%", background: "transparent", border: "1px solid #536471", borderRadius: "6px", padding: "20px 12px 8px", color: "#e7e9ea", fontSize: "17px", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#1d9bf0"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#536471"; }}
                  />
                  <label htmlFor="forgot-identifier" style={{ position: "absolute", left: "12px", top: identifier ? "6px" : "50%", transform: identifier ? "none" : "translateY(-50%)", color: "#71767b", fontSize: identifier ? "11px" : "17px", pointerEvents: "none", transition: "all 0.15s" }}>
                    {inputType === "email" ? t("email_address") : t("phone_number_placeholder")}
                  </label>
                </div>

                {inputType === "phone" && (
                  <>
                    <div style={{ background: "rgba(29,155,240,0.06)", border: "1px solid rgba(29,155,240,0.2)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <MessageSquare size={14} style={{ color: "#1d9bf0", flexShrink: 0 }} />
                      <p style={{ color: "#8b98a5", fontSize: "13px", margin: 0 }}>
                        {t("otp_sms_note")}
                      </p>
                    </div>
                    <div style={{ textAlign: "center", marginBottom: "16px" }}>
                      <button type="button" onClick={() => { setInputType("email"); setIdentifier(""); setError(""); }} style={{ background: "none", border: "none", color: "#1d9bf0", cursor: "pointer", fontSize: "14px", fontWeight: "600", textDecoration: "underline" }}>
                        {t("try_email_instead")}
                      </button>
                    </div>
                  </>
                )}

                <button type="submit" disabled={isSubmitting || !identifier.trim()}
                  style={{ width: "100%", background: isSubmitting || !identifier.trim() ? "#e7e9ea80" : "#e7e9ea", color: "#000", fontWeight: "800", fontSize: "17px", padding: "13px", borderRadius: "9999px", border: "none", cursor: isSubmitting || !identifier.trim() ? "not-allowed" : "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!isSubmitting && identifier.trim()) e.currentTarget.style.background = "#fff"; }}
                  onMouseLeave={e => { if (!isSubmitting && identifier.trim()) e.currentTarget.style.background = "#e7e9ea"; }}
                >
                  {isSubmitting ? t("sending_code") : t("Send verification code")}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: ENTER OTP ── */}
          {step === "otp" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: otpChannel === "mobile" ? "rgba(0,186,124,0.12)" : "rgba(29,155,240,0.12)", border: otpChannel === "mobile" ? "1px solid rgba(0,186,124,0.3)" : "1px solid rgba(29,155,240,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  {otpChannel === "mobile"
                    ? <Phone size={26} color="#00ba7c" />
                    : <ShieldCheck size={26} color="#1d9bf0" />
                  }
                </div>
                <h1 style={{ color: "#e7e9ea", fontSize: "26px", fontWeight: "800", marginBottom: "10px" }}>
                  {otpChannel === "email" ? t("check_your_email")
                    : otpChannel === "mobile" ? t("check_your_phone")
                    : t("check_your_devices") || "Check your devices"}
                </h1>
                <p style={{ color: "#71767b", fontSize: "14px", lineHeight: "1.6" }}>
                  {otpChannel === "email" ? (
                    <>{t("sent_email_code_to") || "We sent a 6-digit email OTP:"} <strong style={{ color: "#e7e9ea" }}>{maskedContact}</strong>.</>
                  ) : otpChannel === "mobile" ? (
                    <>{t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"} <strong style={{ color: "#e7e9ea" }}>{maskedContact}</strong>.</>
                  ) : (
                    <>{t("sent_email_code_to") || "We sent a 6-digit email OTP:"} <strong style={{ color: "#e7e9ea" }}>{maskedContact}</strong> {t("and") || "and"} {t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"} <strong style={{ color: "#e7e9ea" }}>{maskedContact}</strong>.</>
                  )}
                </p>
              </div>

              {/* ── Dev mode banner: show OTP directly ── */}
              {devOtp && (
                <div style={{ background: "rgba(255,212,0,0.08)", border: "1px solid rgba(255,212,0,0.3)", borderRadius: "14px", padding: "14px 18px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🛠️</span>
                    <p style={{ color: "#ffd400", fontSize: "13px", fontWeight: "700", margin: 0 }}>
                      Dev Mode — No {contactType === "phone" ? "SMS" : "email"} gateway configured
                    </p>
                  </div>
                  <p style={{ color: "#8b98a5", fontSize: "12px", margin: "0 0 10px" }}>
                    {contactType === "phone"
                      ? "For sandbox/development testing, you can use this OTP code:"
                      : "Email sending failed. Use this OTP to continue:"
                    }
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d0d0d", borderRadius: "10px", padding: "12px 16px", border: "1px solid #2f3336" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "28px", fontWeight: "800", letterSpacing: "10px", color: "#ffd400" }}>{devOtp}</span>
                    <button onClick={copyDevOtp} style={{ background: otpCopied ? "rgba(0,186,124,0.15)" : "#1d9bf0", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", color: otpCopied ? "#00ba7c" : "#fff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                      {otpCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: "rgba(244,33,46,0.08)", border: "1px solid rgba(244,33,46,0.25)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#f4212e", fontSize: "14px" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: "20px" }}>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); if (error) setError(""); }}
                    disabled={isSubmitting}
                    style={{ width: "100%", background: "#16181c", border: "1px solid #2f3336", borderRadius: "12px", padding: "18px", color: "#1d9bf0", fontSize: "32px", fontFamily: "monospace", fontWeight: "800", letterSpacing: "16px", textAlign: "center", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#1d9bf0"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#2f3336"; }}
                  />
                  <p style={{ color: "#71767b", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>
                    {t("code_expires_10m")}
                  </p>
                </div>

                <button type="submit" disabled={isSubmitting || otp.length !== 6}
                  style={{ width: "100%", background: otp.length !== 6 || isSubmitting ? "#1d9bf080" : "#1d9bf0", color: "#fff", fontWeight: "800", fontSize: "17px", padding: "13px", borderRadius: "9999px", border: "none", cursor: otp.length !== 6 || isSubmitting ? "not-allowed" : "pointer", transition: "background 0.15s", marginBottom: "12px" }}
                >
                  {isSubmitting ? t("verifying") : t("Verify code")}
                </button>
              </form>

              <div style={{ textAlign: "center" }}>
                <button onClick={handleResend} disabled={resendCooldown > 0 || isSubmitting}
                  style={{ background: "none", border: "none", color: resendCooldown > 0 ? "#536471" : "#1d9bf0", fontSize: "14px", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: "600" }}
                >
                  {resendCooldown > 0 ? `${t("resend_code_in")} ${resendCooldown}s` : t("Resend code")}
                </button>
                <br />
                <button onClick={() => { setStep("input"); setOtp(""); setError(""); setDevOtp(null); }}
                  style={{ background: "none", border: "none", color: "#71767b", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}
                >
                  {t("use_different")} {contactType === "phone" ? t("phone_or_email") : t("email_or_phone")}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: SET NEW PASSWORD ── */}
          {step === "reset" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(0,186,124,0.12)", border: "1px solid rgba(0,186,124,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Lock size={26} color="#00ba7c" />
                </div>
                <h1 style={{ color: "#e7e9ea", fontSize: "26px", fontWeight: "800", marginBottom: "8px" }}>{t("set_new_password")}</h1>
                <p style={{ color: "#71767b", fontSize: "14px" }}>{t("identity_verified_desc")}</p>
              </div>

              {error && (
                <div style={{ background: "rgba(244,33,46,0.08)", border: "1px solid rgba(244,33,46,0.25)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#f4212e", fontSize: "14px" }}>
                  {error}
                </div>
              )}

              {/* Password Generator */}
              <div style={{ background: "#0d0d0d", border: "1px solid #2f3336", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(120,86,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <KeyRound size={15} color="#7856ff" />
                  </div>
                  <div>
                    <p style={{ color: "#e7e9ea", fontWeight: "700", fontSize: "14px", margin: 0 }}>{t("password_suggestion")}</p>
                    <p style={{ color: "#71767b", fontSize: "12px", margin: 0 }}>{t("password_suggestion_desc")}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", background: "#16181c", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", border: "1px solid #2f3336", gap: "8px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setCopied(false); if (error) setError(""); }}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#1d9bf0", fontSize: "16px", fontFamily: "monospace", letterSpacing: showPassword ? "2px" : "4px", fontWeight: "700", outline: "none" }}
                  />
                  <button onClick={() => setShowPassword(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#71767b", padding: "2px" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#e7e9ea")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#71767b")}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: "4px", borderRadius: "9999px", background: i < strengthScore ? strengthColors[strengthScore] : "#2f3336", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <p style={{ color: strengthColors[strengthScore] || "#536471", fontSize: "12px", fontWeight: "600", margin: 0 }}>
                    {strengthLabels[strengthScore] || "Enter a password"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={regeneratePassword} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#16181c", border: "1px solid #2f3336", borderRadius: "9999px", color: "#e7e9ea", padding: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                    <RefreshCw size={13} style={{ transform: isSpinning ? "rotate(360deg)" : "rotate(0deg)", transition: "transform 0.5s" }} />
                    {t("Regenerate")}
                  </button>
                  <button onClick={copyPassword} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: copied ? "rgba(0,186,124,0.15)" : "#1d9bf0", border: "none", borderRadius: "9999px", color: copied ? "#00ba7c" : "#fff", padding: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? t("copied") : t("Copy")}
                  </button>
                </div>
              </div>

              <form onSubmit={handleResetPassword}>
                <button type="submit" disabled={isSubmitting || newPassword.length < 8 || strengthScore < 2}
                  style={{ width: "100%", background: isSubmitting || newPassword.length < 8 || strengthScore < 2 ? "#e7e9ea80" : "#e7e9ea", color: "#000", fontWeight: "800", fontSize: "17px", padding: "13px", borderRadius: "9999px", border: "none", cursor: isSubmitting || newPassword.length < 8 || strengthScore < 2 ? "not-allowed" : "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!isSubmitting && newPassword.length >= 8 && strengthScore >= 2) e.currentTarget.style.background = "#fff"; }}
                  onMouseLeave={e => { if (!isSubmitting && newPassword.length >= 8 && strengthScore >= 2) e.currentTarget.style.background = "#e7e9ea"; }}
                >
                  {isSubmitting ? t("resetting_password") : t("Reset password")}
                </button>
              </form>
            </>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(0,186,124,0.12)", border: "1px solid rgba(0,186,124,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg viewBox="0 0 24 24" style={{ width: "32px", height: "32px", fill: "#00ba7c" }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              </div>
              <h1 style={{ color: "#e7e9ea", fontSize: "26px", fontWeight: "800", marginBottom: "10px" }}>{t("password_reset_success")}</h1>
              <p style={{ color: "#71767b", fontSize: "14px", lineHeight: "1.6", marginBottom: "8px" }}>
                {t("password_changed_desc")}
              </p>
              {contactType === "email" && verifiedEmail && !verifiedEmail.includes("@phone.twiller.local") && (
                <p style={{ color: "#71767b", fontSize: "13px", marginBottom: "28px" }}>
                  {t("confirmation_sent_to")} <strong style={{ color: "#e7e9ea" }}>{verifiedEmail}</strong>.
                </p>
              )}
              {contactType === "phone" && (
                <p style={{ color: "#71767b", fontSize: "13px", marginBottom: "28px" }}>
                  {t("signin_phone_desc")}
                </p>
              )}
              <button onClick={onBack}
                style={{ width: "100%", background: "#1d9bf0", color: "#fff", fontWeight: "800", fontSize: "17px", padding: "13px", borderRadius: "9999px", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1a8cd8")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1d9bf0")}
              >
                {t("signin_new_password")}
              </button>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}
