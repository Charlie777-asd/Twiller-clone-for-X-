"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ChevronRight, ChevronLeft, User, Lock, Bell, Eye,
  Type, Globe, HelpCircle, Shield, Smartphone, Mail,
  Phone, RefreshCw, Copy, Check, Eye as EyeIcon, EyeOff,
  Key, AlertCircle, CheckCircle2, X as XIcon, MapPin, MessageSquare,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { encodeEmailPath, mediaUrl } from "@/lib/backendUrl";
import { isNotificationsEnabled, requestNotificationPermission, setNotificationsEnabled } from "@/lib/notificationService";
import OtpChannelPicker, { OtpChannel } from "@/components/OtpChannelPicker";
import LoadingSpinner from "../loading-spinner";


// ── Password generator (letters only) ──────────────────────────────────────
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
function genPassword(len = 16): string {
  let pw = UPPER[Math.floor(Math.random() * UPPER.length)] + LOWER[Math.floor(Math.random() * LOWER.length)];
  const all = UPPER + LOWER;
  for (let i = 2; i < len; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

// ── Types ───────────────────────────────────────────────────────────────────
type SettingsSection =
  | "main"
  | "account"
  | "security"
  | "privacy"
  | "notifications"
  | "accessibility"
  | "display"
  | "additional"
  | "helpcentre"
  | "transactions";

const SETTINGS_MENU = [
  { id: "account",       icon: User,         label: "Your account",          desc: "See account information, update username or email" },
  { id: "security",      icon: Lock,         label: "Security and access",   desc: "Change password, manage sessions" },
  { id: "privacy",       icon: Eye,          label: "Privacy and safety",    desc: "Control your data and privacy" },
  { id: "notifications", icon: Bell,         label: "Notifications",         desc: "Manage notification preferences" },
  { id: "accessibility", icon: Smartphone,   label: "Accessibility",         desc: "Contrast, motion, color" },
  { id: "display",       icon: Type,         label: "Display",               desc: "Font size, colors, backgrounds" },
  { id: "transactions",  icon: CreditCard,   label: "Transactions",          desc: "View your subscription payments and history" },
  { id: "additional",    icon: Globe,        label: "Additional resources",  desc: "Terms, privacy policy, cookies" },
  { id: "helpcentre",    icon: HelpCircle,   label: "Help Centre",           desc: "Contact us, FAQs, and support" },
];

// ── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? "bg-[#1d9bf0]" : "bg-[#536471]"}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? "left-7" : "left-1"}`} />
    </button>
  );
}

// ── Back header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea]">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[#71767b] text-xs">{t("Settings")}</p>
          <h1 className="text-[#e7e9ea] font-extrabold text-xl leading-tight">{t(title)}</h1>
        </div>
      </div>
    </div>
  );
}

// ── Settings Item Row ────────────────────────────────────────────────────────
function SettingsRow({ label, value, onClick, right }: {
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-4 border-b border-[#2f3336] ${onClick ? "hover:bg-white/5 cursor-pointer" : ""} transition-colors`}
    >
      <div>
        <p className="text-[#e7e9ea] text-[15px]">{t(label)}</p>
        {value && <p className="text-[#71767b] text-sm mt-0.5">{t(value)}</p>}
      </div>
      {right || (onClick && <ChevronRight size={18} className="text-[#71767b]" />)}
    </div>
  );
}

// ── Password strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const longEnough = password.length >= 12;
  const score = [hasUpper, hasLower, hasDigit || hasSymbol, longEnough].filter(Boolean).length;
  const { t } = useLanguage();
  const labels = ["", t("Weak"), t("Fair"), t("Good"), t("Strong")];
  const colors = ["", "#f4212e", "#ffd400", "#00ba7c", "#1d9bf0"];

  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i <= score ? colors[score] : "#2f3336" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

// ── SECTION: Account ─────────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.slice(0, 2) + "*".repeat(Math.max(0, local.length - 2));
  return `${masked}@${domain}`;
}

function AccountSection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  type EditField = "username" | "displayName" | "phone" | "email";
  type OtpStep = "idle" | "sending" | "otp_entry" | "new_value" | "saving";

  const [editing, setEditing] = useState<EditField | null>(null);
  const [value, setValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [changeToken, setChangeToken] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<OtpChannel>("both");

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startEdit = (field: EditField) => {
    setEditing(field);
    setValue(field === "username" ? user?.username || ""
      : field === "displayName" ? user?.displayName || ""
        : field === "phone" ? user?.phone || ""
          : user?.email || "");
    setNewValue(""); setOtpValue(""); setChangeToken("");
    setOtpStep("idle"); setError(""); setSuccess("");
  };

  const closeEdit = () => {
    setEditing(null); setOtpStep("idle");
    setOtpValue(""); setNewValue(""); setChangeToken(""); setError(""); setWarning("");
  };

  // Simple save for username / displayName
  const saveSimple = async () => {
    if (!user || !value.trim()) return;
    setSaving(true); setError("");
    try {
      await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, { [editing!]: value.trim() });
      await refreshUser();
      setSuccess(`${editing === "displayName" ? t("Name") : t("Username")} updated!`);
      closeEdit();
    } catch { setError("Failed to update. Please try again."); }
    finally { setSaving(false); }
  };

  // Step 1: Request OTP for email/phone change
  const sendChangeOtp = async (channel: OtpChannel = selectedChannel) => {
    if (!user?._id) return;
    setOtpStep("sending"); setError(""); setWarning("");
    const purpose = editing === "email" ? "change_email" : "change_phone";
    try {
      const res = await axiosInstance.post("/user/send-change-otp", { userId: user._id, purpose, channel });
      setOtpStep("otp_entry");
      startResendCooldown();
      if (res.data.warning) {
        setWarning(res.data.warning);
      }
      setSuccess(res.data.message || t("OTP sent to your email."));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      const axErr = err as { response?: { data?: { error?: string; warning?: string } } };
      setError(axErr?.response?.data?.error || "Failed to send OTP.");
      if (axErr?.response?.data?.warning) {
        setWarning(axErr.response.data.warning);
      }
      setOtpStep("idle");
    }
  };

  // Step 2: Verify OTP → get changeToken
  const verifyChangeOtp = async () => {
    if (!user?._id || !otpValue.trim()) return;
    setSaving(true); setError("");
    const purpose = editing === "email" ? "change_email" : "change_phone";
    try {
      const res = await axiosInstance.post("/user/verify-change-otp", {
        userId: user._id, purpose, otp: otpValue.trim(),
      });
      setChangeToken(res.data.changeToken);
      setOtpStep("new_value");
      setOtpValue("");
    } catch (err) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr?.response?.data?.error || "Incorrect OTP. Please try again.");
    } finally { setSaving(false); }
  };

  // Step 3: Save new email/phone using changeToken
  const saveNewValue = async () => {
    if (!user?._id || !newValue.trim() || !changeToken) return;
    setSaving(true); setError("");
    try {
      if (editing === "email") {
        await axiosInstance.patch(`/user/${user._id}/update-email`, { changeToken, newEmail: newValue.trim() });
      } else {
        await axiosInstance.patch(`/user/${user._id}/update-phone`, { changeToken, newPhone: newValue.trim() });
      }
      await refreshUser();
      setSuccess(`${editing === "email" ? "Email" : "Phone"} updated successfully!`);
      closeEdit();
    } catch (err) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr?.response?.data?.error || "Failed to update. Please try again.");
    } finally { setSaving(false); }
  };

  const joinedStr = user?.joinedDate
    ? new Date(user.joinedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div>
      <SectionHeader title="Your account" onBack={onBack} />
      {success && (
        <div className="mx-4 mt-3 p-3 bg-[#00ba7c]/10 border border-[#00ba7c]/30 rounded-xl flex items-center gap-2 text-[#00ba7c] text-sm">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      <div className="mt-2">
        <div className="px-4 py-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Account information")}</div>
        <SettingsRow label="Username" value={`@${user?.username || ""}`} onClick={() => startEdit("username")} />
        <SettingsRow label="Display name" value={user?.displayName} onClick={() => startEdit("displayName")} />
        <SettingsRow label="Email" value={user?.email} onClick={() => startEdit("email")} />
        <SettingsRow label="Phone" value={user?.phone || "Not added"} onClick={() => startEdit("phone")} />

        {/* WhatsApp Sandbox Card — shown below Phone row */}
        <div className="mx-4 my-2 rounded-xl overflow-hidden border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/8 to-[#128C7E]/5">
          <div className="flex items-start gap-3 px-4 py-3">
            {/* WhatsApp icon */}
            <div className="w-9 h-9 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#e7e9ea] text-sm font-semibold leading-tight">📱 {t("Required for WhatsApp OTP")}</p>
              <p className="text-[#71767b] text-xs mt-1 leading-relaxed">
                {t("To receive OTP codes via WhatsApp on your phone number, you must join our sandbox first. This is a one-time setup.")}
              </p>
              <a
                href="https://wa.me/14155238886?text=join%20bone-couple"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[#25D366] text-xs font-bold hover:underline transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t("Tap to Join WhatsApp Sandbox →")}
              </a>
            </div>
          </div>
        </div>

        <SettingsRow label="Joined" value={joinedStr} />
        <SettingsRow label="Country" value="India" />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Account actions")}</div>
        <a
          href="https://wa.me/14155238886?text=join%20bone-couple"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-4 border-b border-[#2f3336] hover:bg-white/5 transition-colors"
        >
          <p className="text-[#1d9bf0] text-[15px] font-semibold">{t("Join WhatsApp Sandbox")}</p>
          <p className="text-[#71767b] text-sm mt-0.5">{t("Click to opt-in to WhatsApp OTP messages during testing")}</p>
        </a>
        <div
          onClick={async () => {
            if (window.confirm("Are you sure you want to deactivate your account? You will be logged out.")) {
              try {
                await axiosInstance.patch(`/userupdate/${encodeEmailPath(user?.email || "")}`, { isActive: false });
                window.location.reload();
              } catch { alert("Failed to deactivate account."); }
            }
          }}
          className="px-4 py-4 border-b border-[#2f3336] cursor-pointer hover:bg-[#f4212e]/5 transition-colors"
        >
          <p className="text-[#f4212e] text-[15px] font-semibold">{t("Deactivate account")}</p>
          <p className="text-[#71767b] text-sm mt-0.5">{t("This will not permanently delete your account.")}</p>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#5b7083]/50 p-4">
          <div className="bg-black border border-[#2f3336] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#e7e9ea] font-bold text-xl">
                {editing === "displayName" ? t("Change name")
                  : editing === "username" ? t("Change username")
                    : editing === "email" ? t("Change email")
                      : user?.phone ? t("Change phone number") : t("Add phone number")}
              </h2>
              <button onClick={closeEdit} className="p-1.5 rounded-full hover:bg-white/10 text-[#71767b]">
                <XIcon size={18} />
              </button>
            </div>

            {error && (
              <div className="text-[#f4212e] text-sm mb-3 bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-xl p-3">
                <p>{error}</p>
                {(error.toLowerCase().includes("twilio") || error.toLowerCase().includes("sandbox") || error.toLowerCase().includes("phone") || error.toLowerCase().includes("mobile")) && (
                  <div className="mt-2 p-2 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                    <p className="text-[#8b98a5] text-[11px] leading-relaxed">
                      To receive OTP codes on WhatsApp, make sure to add your phone number and join our Twilio sandbox.
                    </p>
                    <a
                      href="https://wa.me/14155238886?text=join%20bone-couple"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] text-xs font-bold underline mt-1 block"
                    >
                      Click here to join Twilio Sandbox →
                    </a>
                  </div>
                )}
              </div>
            )}

            {warning && (
              <div className="text-[#ffd400] text-sm mb-3 bg-[#ffd400]/10 border border-[#ffd400]/20 rounded-xl p-3">
                <p>{warning}</p>
                <div className="mt-2 p-2 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                  <a
                    href="https://wa.me/14155238886?text=join%20bone-couple"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] text-xs font-bold underline block"
                  >
                    Tap here to join Twilio Sandbox →
                  </a>
                </div>
              </div>
            )}

            {/* Username / DisplayName — simple edit */}
            {(editing === "username" || editing === "displayName") && (
              <>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors"
                    placeholder={editing === "displayName" ? t("Your name") : t("username")}
                    maxLength={editing === "displayName" ? 50 : 15}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={closeEdit} className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-2.5 rounded-full hover:bg-white/5 transition-colors">{t("Cancel")}</button>
                  <button onClick={saveSimple} disabled={saving || !value.trim()} className="flex-1 bg-[#e7e9ea] text-black font-bold py-2.5 rounded-full hover:bg-white transition-colors disabled:opacity-50">
                    {saving ? t("Saving…") : t("Save")}
                  </button>
                </div>
              </>
            )}

            {/* Email / Phone — OTP-verified flow */}
            {(editing === "email" || editing === "phone") && (
              <>
                {/* Step 0: Initiate */}
                {otpStep === "idle" && (
                  <>
                    <p className="text-[#71767b] text-sm mb-5 leading-relaxed">
                      {editing === "email"
                        ? t("To change your email, we'll send a verification code to your current email address.")
                        : user?.phone
                          ? t("To change your phone number, we'll send a verification code to your registered contact.")
                          : t("To add a phone number, we'll verify your identity by sending a code to your contact.")}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={closeEdit} className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-2.5 rounded-full hover:bg-white/5 transition-colors">{t("Cancel")}</button>
                      <button onClick={() => setShowChannelPicker(true)} className="flex-1 bg-[#1d9bf0] text-white font-bold py-2.5 rounded-full hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-2">
                        <Mail size={15} /> {editing === "email" ? t("Send verification code") : user?.phone ? t("Send verification code") : t("Verify with existing email")}
                      </button>
                    </div>
                  </>
                )}

                {/* Step 1: Sending */}
                {otpStep === "sending" && (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[#71767b] text-sm">{t("Sending verification code…")}</p>
                  </div>
                )}

                {/* Step 2: OTP entry */}
                {otpStep === "otp_entry" && (
                  <>
                    <p className="text-[#71767b] text-sm mb-4 leading-relaxed">
                      {selectedChannel === "email" ? (
                        <>
                          {t("sent_email_code_to") || "We sent a 6-digit email OTP:"}{" "}
                          <strong className="text-[#e7e9ea]">{user?.email ? maskEmail(user.email) : t("your email")}</strong>
                        </>
                      ) : selectedChannel === "mobile" ? (
                        <>
                          {t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"}{" "}
                          <strong className="text-[#e7e9ea]">{user?.phone}</strong>
                        </>
                      ) : (
                        <>
                          {t("sent_email_code_to") || "We sent a 6-digit email OTP:"}{" "}
                          <strong className="text-[#e7e9ea]">{user?.email ? maskEmail(user.email) : t("your email")}</strong>{" "}
                          {t("and") || "and"}{" "}
                          {t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"}{" "}
                          <strong className="text-[#e7e9ea]">{user?.phone}</strong>
                        </>
                      )}
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={otpValue}
                      onChange={e => { setOtpValue(e.target.value.replace(/\D/g, "")); setError(""); }}
                      className="w-full bg-[#16181c] border border-[#2f3336] focus:border-[#1d9bf0] rounded-xl px-4 py-4 text-[#1d9bf0] text-3xl font-mono font-bold text-center tracking-[12px] outline-none transition-colors mb-4"
                      autoFocus
                    />
                    <div className="flex gap-3 mb-3">
                      <button onClick={closeEdit} className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-2.5 rounded-full hover:bg-white/5 transition-colors">{t("Cancel")}</button>
                      <button onClick={verifyChangeOtp} disabled={saving || otpValue.length !== 6} className="flex-1 bg-[#1d9bf0] text-white font-bold py-2.5 rounded-full hover:bg-[#1a8cd8] transition-colors disabled:opacity-50">
                        {saving ? t("Verifying…") : t("Verify code")}
                      </button>
                    </div>
                    <button onClick={resendCooldown > 0 ? undefined : () => sendChangeOtp()} disabled={resendCooldown > 0} className="w-full text-center text-sm text-[#71767b] hover:text-[#1d9bf0] transition-colors disabled:cursor-default disabled:text-[#536471]">
                      {resendCooldown > 0 ? `${t("Resend in")} ${resendCooldown}s` : t("Resend code")}
                    </button>
                  </>
                )}

                {/* Step 3: Enter new value */}
                {otpStep === "new_value" && (
                  <>
                    <p className="text-[#00ba7c] text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={15} /> {t("Identity verified. Enter your new")} {editing}.</p>
                    <input
                      type={editing === "email" ? "email" : "tel"}
                      placeholder={editing === "email" ? "new@email.com" : "+91 98765 43210"}
                      value={newValue}
                      onChange={e => { setNewValue(e.target.value); setError(""); }}
                      className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors mb-4"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button onClick={closeEdit} className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-2.5 rounded-full hover:bg-white/5 transition-colors">{t("Cancel")}</button>
                      <button onClick={saveNewValue} disabled={saving || !newValue.trim()} className="flex-1 bg-[#e7e9ea] text-black font-bold py-2.5 rounded-full hover:bg-white transition-colors disabled:opacity-50">
                        {saving ? t("Saving…") : t("Update")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* OTP Channel Picker Modal */}
      {showChannelPicker && (
        <OtpChannelPicker
          hasEmail={!!(user?.email && !user.email.includes("@phone.twiller.local"))}
          hasPhone={!!user?.phone}
          title={editing === "email" ? "Send email change OTP" : "Send phone change OTP"}
          subtitle="Choose where to receive your one-time verification code."
          onSelect={(ch) => {
            setSelectedChannel(ch);
            setShowChannelPicker(false);
            sendChangeOtp(ch);
          }}
          onCancel={() => setShowChannelPicker(false)}
        />
      )}
    </div>

  );
}

// ── SECTION: Security ────────────────────────────────────────────────────────
function SecuritySection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user, setUserPassword, verifyUserPassword } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasExistingPassword = !!user?.lastPasswordChange;

  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user?._id) return;
    setLoadingSessions(true);
    try {
      const res = await axiosInstance.get(`/users/${user._id}/sessions`);
      setSessions(res.data || []);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setLoadingSessions(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLogoutSession = async (sessionId: string) => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.delete(`/users/${user._id}/sessions/${sessionId}`);
      setSessions(res.data || []);
    } catch (e) {
      console.error("Failed to revoke session", e);
    }
  };

  const handleLogoutOtherSessions = async () => {
    if (!user?._id) return;
    const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
    if (!currentSessionId) return;
    try {
      const res = await axiosInstance.delete(`/users/${user._id}/sessions/${currentSessionId}/other`);
      setSessions(res.data || []);
    } catch (e) {
      console.error("Failed to revoke other sessions", e);
    }
  };

  const generate = useCallback(() => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 500);
    const pw = genPassword();
    setNewPw(pw);
    setConfirmPw(pw);
    setCopied(false);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newPw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const save = async () => {
    setError("");
    if (!newPw) { setError("Please enter a new password."); return; }
    if (newPw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords don't match."); return; }
    if (hasExistingPassword && !currentPw) { setError("Please enter your current password."); return; }
    if (hasExistingPassword) {
      const valid = await verifyUserPassword(currentPw);
      if (!valid) { setError("Current password is incorrect."); return; }
    }
    setSaving(true);
    try {
      await setUserPassword(newPw, currentPw || undefined);
      setSuccess("Password updated successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update password.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const lastChanged = user?.lastPasswordChange
    ? new Date(user.lastPasswordChange).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div>
      <SectionHeader title="Security and account access" onBack={onBack} />

      <div className="p-4 space-y-6">
        {/* Change password */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2f3336] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center">
              <Key size={16} className="text-[#1d9bf0]" />
            </div>
            <div>
              <p className="text-[#e7e9ea] font-bold">{t("Change password")}</p>
              {lastChanged && <p className="text-[#71767b] text-xs">`${t("Last changed:")} ${lastChanged}`</p>}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {success && (
              <div className="p-3 bg-[#00ba7c]/10 border border-[#00ba7c]/30 rounded-xl flex items-center gap-2 text-[#00ba7c] text-sm">
                <CheckCircle2 size={16} /> {success}
              </div>
            )}
            {error && (
              <div className="p-3 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-xl flex items-center gap-2 text-[#f4212e] text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {hasExistingPassword && (
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder={t("Current password")}
                  value={currentPw}
                  onChange={e => { setCurrentPw(e.target.value); setError(""); }}
                  className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-[#e7e9ea]">
                  {showCurrent ? <EyeOff size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            )}

            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder={t("New password")}
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setError(""); }}
                className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-[#e7e9ea]">
                {showNew ? <EyeOff size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            {newPw && <PasswordStrength password={newPw} />}

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder={t("Confirm new password")}
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                className={`w-full bg-transparent border rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors pr-10 ${
                  confirmPw && newPw !== confirmPw ? "border-[#f4212e]" : "border-[#536471] focus:border-[#1d9bf0]"
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-[#e7e9ea]">
                {showConfirm ? <EyeOff size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>

            {/* Password Generator */}
            <div className="bg-black rounded-xl border border-[#2f3336] p-3">
              <div className="flex items-center gap-2 mb-2">
                <Key size={14} className="text-[#7856ff]" />
                <p className="text-[#e7e9ea] text-sm font-bold">{t("Password Generator")}</p>
                <span className="text-[#71767b] text-xs">· {t("letters only")}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generate}
                  className="flex items-center gap-1.5 bg-[#16181c] border border-[#2f3336] hover:bg-[#1d1f23] text-[#e7e9ea] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
                >
                  <RefreshCw size={13} style={{ transform: spinning ? "rotate(360deg)" : "", transition: "transform 0.5s" }} />
                  {t("Generate")}
                </button>
                {newPw && (
                  <button
                    onClick={copy}
                    className="flex items-center gap-1.5 bg-[#1d9bf0]/15 hover:bg-[#1d9bf0]/25 text-[#1d9bf0] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? t("Copied!") : t("Copy")}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || !newPw}
              className="w-full bg-[#e7e9ea] hover:bg-white text-black font-extrabold py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t("Saving…") : t("Save password")}
            </button>
          </div>
        </div>

        {/* Active sessions */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2f3336] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#7856ff]/10 flex items-center justify-center">
                <Shield size={16} className="text-[#7856ff]" />
              </div>
              <p className="text-[#e7e9ea] font-bold">{t("Active sessions")}</p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleLogoutOtherSessions}
                className="text-xs text-[#1d9bf0] hover:underline font-bold"
              >
                {t("Log out other sessions") || "Log out other sessions"}
              </button>
            )}
          </div>
          <div className="p-4 space-y-2">
            {loadingSessions ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[#71767b] text-sm text-center py-2">{t("No active sessions found") || "No active sessions found."}</p>
            ) : (
              sessions.map((session, i) => {
                const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
                const isCurrent = session.sessionId === currentSessionId;
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#2f3336] last:border-0">
                    <div>
                      <p className="text-[#e7e9ea] text-sm font-semibold">
                        {session.browser || "Unknown Browser"} on {session.os || "Unknown OS"}
                      </p>
                      <p className="text-[#71767b] text-xs">
                        {session.ipAddress || "Unknown IP"} · {isCurrent ? t("Active now") : new Date(session.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs text-[#00ba7c] bg-[#00ba7c]/10 px-2.5 py-1 rounded-full font-bold">{t("Current")}</span>
                    ) : (
                      <button
                        onClick={() => handleLogoutSession(session.sessionId)}
                        className="text-xs text-[#f4212e] hover:underline font-semibold"
                      >
                        {t("Log out")}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Two-factor (UI only) */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2f3336] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00ba7c]/10 flex items-center justify-center">
              <Smartphone size={16} className="text-[#00ba7c]" />
            </div>
            <div>
              <p className="text-[#e7e9ea] font-bold">{t("Two-factor authentication")}</p>
              <p className="text-[#71767b] text-xs">{t("Add an extra layer of security")}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e7e9ea] text-sm">{t("Authenticator app")}</p>
                <p className="text-[#71767b] text-xs">{t("Not configured")}</p>
              </div>
              <button 
                onClick={() => alert("Two-factor authentication configuration coming soon.")}
                className="border border-[#e7e9ea] text-[#e7e9ea] hover:bg-white/10 font-bold rounded-full px-4 py-1.5 text-sm transition-colors"
              >
                {t("Set up")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SECTION: Privacy ─────────────────────────────────────────────────────────
function PrivacySection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [protectedTweets, setProtectedTweets] = useState(user?.privacySettings?.protectedTweets ?? false);
  const [dmFromAnyone, setDmFromAnyone] = useState(user?.privacySettings?.dmFromAnyone ?? true);
  const [tagPhotoOpt, setTagPhotoOpt] = useState(true);
  const [sensitiveMedia, setSensitiveMedia] = useState(false);

  const save = useCallback(async () => {
    if (!user) return;
    try {
      await axiosInstance.patch(`/user/${encodeEmailPath(user.email)}/privacy`, { privacySettings: { protectedTweets, dmFromAnyone } });
    } catch { /* ignore */ }
  }, [user, protectedTweets, dmFromAnyone]);

  return (
    <div>
      <SectionHeader title="Privacy and safety" onBack={onBack} />
      <div className="divide-y divide-[#2f3336]">
        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Your posts")}</div>
        <SettingsRow
          label="Protect your posts"
          value="Only approved followers can see your posts"
          right={<Toggle value={protectedTweets} onChange={(v) => { setProtectedTweets(v); setTimeout(save, 0); }} />}
        />
        <SettingsRow
          label="Tag photos"
          value="Allow anyone to tag you in photos"
          right={<Toggle value={tagPhotoOpt} onChange={setTagPhotoOpt} />}
        />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Direct messages")}</div>
        <SettingsRow
          label="Allow DMs from everyone"
          value="Anyone can send you a direct message"
          right={<Toggle value={dmFromAnyone} onChange={(v) => { setDmFromAnyone(v); setTimeout(save, 0); }} />}
        />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Content")}</div>
        <SettingsRow
          label="Display sensitive media"
          value="Show media that may contain nudity or violence"
          right={<Toggle value={sensitiveMedia} onChange={setSensitiveMedia} />}
        />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Account data")}</div>
        <SettingsRow label="Blocked accounts" value="See who you've blocked" onClick={() => alert("Blocked accounts management coming soon!")} />
        <SettingsRow label="Muted accounts" value="See who you've muted" onClick={() => alert("Muted accounts management coming soon!")} />
        <SettingsRow label="Download your data" value="Request a copy of all your X data" onClick={() => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user || {}, null, 2));
          const dlAnchorElem = document.createElement('a');
          dlAnchorElem.setAttribute("href", dataStr);
          dlAnchorElem.setAttribute("download", "twiller_data.json");
          dlAnchorElem.click();
        }} />
      </div>
    </div>
  );
}

// ── SECTION: Notifications ────────────────────────────────────────────────────
function NotificationsSection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    likes:    user?.notificationPrefs?.likes    ?? true,
    retweets: user?.notificationPrefs?.retweets ?? true,
    follows:  user?.notificationPrefs?.follows  ?? true,
    mentions: user?.notificationPrefs?.mentions ?? true,
    email:    user?.notificationPrefs?.email    ?? false,
  });
  const [browserEnabled, setBrowserEnabled] = useState(() => isNotificationsEnabled());
  const [browserMsg, setBrowserMsg] = useState("");

  const update = async (key: keyof typeof prefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    if (!user) return;
    try {
      await axiosInstance.patch(`/user/${encodeEmailPath(user.email)}/notification-prefs`, { notificationPrefs: next });
    } catch { /* ignore */ }
  };

  const handleBrowserToggle = async () => {
    if (!browserEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        setBrowserEnabled(true);
        setBrowserMsg("Browser notifications enabled! ✅");
        if (user?.email) await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, { notificationsEnabled: true }).catch(() => {});
      } else {
        setBrowserMsg("Permission denied — please allow notifications in your browser settings.");
      }
    } else {
      setNotificationsEnabled(false);
      setBrowserEnabled(false);
      setBrowserMsg("Browser notifications disabled.");
      if (user?.email) await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, { notificationsEnabled: false }).catch(() => {});
    }
    setTimeout(() => setBrowserMsg(""), 3000);
  };

  return (
    <div>
      <SectionHeader title="Notifications" onBack={onBack} />
      <div className="divide-y divide-[#2f3336]">
        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Browser notifications")}</div>
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#e7e9ea] font-semibold">{t("Keyword popup notifications")}</p>
            <p className="text-[#71767b] text-sm">{t("Show browser popups when posts match your interests")}</p>
            {browserMsg && <p className="text-[#1d9bf0] text-xs mt-1">{browserMsg}</p>}
          </div>
          <Toggle value={browserEnabled} onChange={handleBrowserToggle} />
        </div>

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Push notifications")}</div>
        <SettingsRow label="Likes" value="When someone likes your post" right={<Toggle value={prefs.likes}    onChange={v => update("likes",    v)} />} />
        <SettingsRow label="Reposts" value="When someone reposts your post"  right={<Toggle value={prefs.retweets} onChange={v => update("retweets", v)} />} />
        <SettingsRow label="New followers" value="When someone follows you" right={<Toggle value={prefs.follows}  onChange={v => update("follows",  v)} />} />
        <SettingsRow label="Mentions" value="When someone mentions you"    right={<Toggle value={prefs.mentions} onChange={v => update("mentions", v)} />} />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Email notifications")}</div>
        <SettingsRow
          label="Email notifications"
          value="Receive email updates from X"
          right={<Toggle value={prefs.email} onChange={v => update("email", v)} />}
        />
        <SettingsRow label="Email digest" value="A weekly summary of your activity" onClick={() => alert("Email digest preferences saved.")} />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Filters")}</div>
        <SettingsRow label="Quality filter" value="Filter low-quality content from notifications" onClick={() => alert("Quality filter updated.")} />
        <SettingsRow label="Muted notifications" value="Manage notifications you've muted" onClick={() => alert("Muted notifications management coming soon.")} />
      </div>
    </div>
  );
}

// ── SECTION: Accessibility ───────────────────────────────────────────────────
function AccessibilitySection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [reduceMotion, setReduceMotion] = useState(user?.accessibilityPrefs?.reduceMotion ?? false);
  const [highContrast, setHighContrast] = useState(user?.accessibilityPrefs?.highContrast ?? false);
  const [colorBlindMode, setColorBlindMode] = useState(user?.accessibilityPrefs?.colorBlindMode ?? false);
  const [autoplayGifs, setAutoplayGifs] = useState(user?.accessibilityPrefs?.autoplayGifs ?? true);
  const [autoplayVideos, setAutoplayVideos] = useState(user?.accessibilityPrefs?.autoplayVideos ?? true);

  React.useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(async () => {
      try {
        await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, {
          accessibilityPrefs: { reduceMotion, highContrast, colorBlindMode, autoplayGifs, autoplayVideos }
        });
        refreshUser();
      } catch { }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [reduceMotion, highContrast, colorBlindMode, autoplayGifs, autoplayVideos, user, refreshUser]);

  return (
    <div>
      <SectionHeader title="Accessibility" onBack={onBack} />
      <div className="divide-y divide-[#2f3336]">
        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Visual")}</div>
        <SettingsRow label="Increase color contrast" value="Improve readability with higher contrast" right={<Toggle value={highContrast} onChange={setHighContrast} />} />
        <SettingsRow label="Color blind mode" value="Optimize colors for color blindness" right={<Toggle value={colorBlindMode} onChange={setColorBlindMode} />} />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Motion")}</div>
        <SettingsRow label="Reduce motion" value="Minimize animations and transitions" right={<Toggle value={reduceMotion} onChange={setReduceMotion} />} />

        <div className="px-4 py-2 mt-2 text-[#71767b] text-xs font-semibold uppercase tracking-wider">{t("Media")}</div>
        <SettingsRow label="Autoplay GIFs" value="Play GIFs automatically" right={<Toggle value={autoplayGifs} onChange={setAutoplayGifs} />} />
        <SettingsRow label="Autoplay videos" value="Play videos automatically while browsing" right={<Toggle value={autoplayVideos} onChange={setAutoplayVideos} />} />
      </div>
    </div>
  );
}

// ── SECTION: Display ─────────────────────────────────────────────────────────
function DisplaySection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [fontSize, setFontSize] = useState(user?.displayPrefs?.fontSize ?? 3);
  const [colorAccent, setColorAccent] = useState(user?.displayPrefs?.colorAccent ?? "#1d9bf0");
  const [backgroundTheme, setBackgroundTheme] = useState(user?.displayPrefs?.backgroundTheme ?? "default");

  const ACCENT_COLORS = [
    "#1d9bf0", "#ffd400", "#f91880", "#7856ff", "#ff7a00", "#00ba7c",
  ];
  const FONT_SIZES = ["Xs", "Sm", "Default", "Lg", "Xl"];

  React.useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(async () => {
      try {
        await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, {
          displayPrefs: { fontSize, colorAccent, backgroundTheme }
        });
        refreshUser();
      } catch { }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [fontSize, colorAccent, backgroundTheme, user, refreshUser]);

  return (
    <div>
      <SectionHeader title="Display" onBack={onBack} />
      <div className="p-4 space-y-6">
        {/* Preview */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
          <p className="text-[#e7e9ea] font-bold mb-1" style={{ fontSize: `${12 + fontSize * 2}px` }}>
            {t("Preview text — see how posts look")}
          </p>
          <p className="text-[#71767b]" style={{ fontSize: `${11 + fontSize * 2}px` }}>
            @username · 2h ago
          </p>
        </div>

        {/* Font size */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
          <p className="text-[#e7e9ea] font-bold mb-3">{t("Font size")}</p>
          <div className="flex items-center gap-3">
            <span className="text-[#71767b] text-xs">Aa</span>
            <input
              type="range" min={1} max={5} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="flex-1 accent-[#1d9bf0]"
            />
            <span className="text-[#e7e9ea] font-bold text-lg">Aa</span>
          </div>
          <p className="text-[#71767b] text-xs mt-2 text-center">{t(FONT_SIZES[fontSize - 1])}</p>
        </div>

        {/* Color accent */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
          <p className="text-[#e7e9ea] font-bold mb-3">{t("Color")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setColorAccent(color)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: color, outline: colorAccent === color ? `3px solid ${color}` : "none", outlineOffset: "3px" }}
              >
                {colorAccent === color && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Theme — always dark for now */}
        <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
          <p className="text-[#e7e9ea] font-bold mb-3">{t("Background")}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Default", bg: "#000", text: "#e7e9ea", val: "default" },
              { label: "Dim", bg: "#15202b", text: "#e7e9ea", val: "dim" },
              { label: "Lights out", bg: "#000", text: "#e7e9ea", val: "lights-out" },
            ].map((theme, i) => (
              <button
                key={i}
                onClick={() => setBackgroundTheme(theme.val)}
                className={`p-3 rounded-xl border transition-all ${backgroundTheme === theme.val ? "border-[#1d9bf0]" : "border-[#2f3336] hover:border-[#536471]"}`}
                style={{ background: theme.bg }}
              >
                <p className="text-sm font-bold" style={{ color: theme.text }}>{t(theme.label)}</p>
                {backgroundTheme === theme.val && <span className="text-[10px] text-[#1d9bf0]">Active</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SECTION: Additional ──────────────────────────────────────────────────────
function AdditionalSection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const LINKS = [
    { label: t("Terms of Service"), url: "https://twitter.com/tos" },
    { label: t("Privacy Policy"), url: "https://twitter.com/privacy" },
    { label: t("Cookie Policy"), url: "https://support.twitter.com/articles/20170514" },
    { label: t("Accessibility"), url: "https://help.twitter.com/using-twitter/accessibility-features" },
    { label: t("Ads info"), url: "https://support.twitter.com/articles/20170514" },
    { label: t("Blog"), url: "https://blog.twitter.com/" },
    { label: t("About"), url: "https://about.twitter.com/" },
  ];

  return (
    <div>
      <SectionHeader title="Additional resources" onBack={onBack} />
      <div className="divide-y divide-[#2f3336] mt-2">
        {LINKS.map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors"
          >
            <p className="text-[#e7e9ea] text-[15px]">{link.label}</p>
            <Globe size={16} className="text-[#71767b]" />
          </a>
        ))}
        <div className="px-4 py-6 text-center">
          <p className="text-[#71767b] text-xs">{t("© 2025 X Corp. All rights reserved.")}</p>
          <p className="text-[#71767b] text-xs mt-1">{t("Version 2.0.0")}</p>
        </div>
      </div>
    </div>
  );
}

// ── SECTION: Transactions ──────────────────────────────────────────────────
function TransactionsSection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/subscription/payments/${user._id}`);
      setPayments(res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch payments:", err);
      setError(err.response?.data?.error || "Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return "text-[#00ba7c] bg-[#00ba7c]/10 border-[#00ba7c]/20";
      case "FAILED":
        return "text-[#f4212e] bg-[#f4212e]/10 border-[#f4212e]/20";
      case "PENDING":
      default:
        return "text-[#ffd400] bg-[#ffd400]/10 border-[#ffd400]/20";
    }
  };

  return (
    <div>
      <SectionHeader title="Transaction History" onBack={onBack} />

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-4 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-xl text-[#f4212e] text-sm text-center">
            {t(error)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-[#71767b]">
            <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-[15px]">{t("No transactions found.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((pm) => (
              <div
                key={pm._id}
                className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-4 space-y-3 transition-colors hover:border-[#1d9bf0]/40"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[#e7e9ea] font-bold text-base">
                      ₹{pm.amount}
                    </span>
                    <span className="text-[#71767b] text-xs ml-1.5 uppercase">
                      {pm.currency || "INR"}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(pm.status)}`}
                  >
                    {t(pm.status?.toLowerCase() || "pending")}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#71767b]">
                  {pm.razorpay_payment_id && (
                    <div className="flex justify-between">
                      <span>{t("Payment ID")}</span>
                      <span className="font-mono text-[#e7e9ea]">{pm.razorpay_payment_id}</span>
                    </div>
                  )}
                  {pm.razorpay_order_id && (
                    <div className="flex justify-between">
                      <span>{t("Order ID")}</span>
                      <span className="font-mono text-[#e7e9ea]">{pm.razorpay_order_id}</span>
                    </div>
                  )}
                  {pm.payment_method && (
                    <div className="flex justify-between">
                      <span>{t("Method")}</span>
                      <span className="text-[#e7e9ea] capitalize">{pm.payment_method}</span>
                    </div>
                  )}
                  {pm.created_at && (
                    <div className="flex justify-between">
                      <span>{t("Date")}</span>
                      <span className="text-[#e7e9ea]">{new Date(pm.created_at).toLocaleString()}</span>
                    </div>
                  )}
                  {pm.failure_reason && (
                    <div className="flex flex-col gap-1 mt-2 text-[#f4212e] bg-[#f4212e]/5 p-2 rounded-lg border border-[#f4212e]/10">
                      <span className="font-semibold">{t("Failure Reason") || "Failure Reason"}</span>
                      <span>{pm.failure_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION: Help Centre ──────────────────────────────────────────────────
function HelpCentreSection({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const faqs = [
    { q: t("How do I reset my password?"), a: t("Go to Settings → Security and access → Change password. Or use 'Forgot Password' on the sign-in screen.") },
    { q: t("How do I change my username?"), a: t("Go to Settings → Your account → Account information, then click on Username to change it.") },
    { q: t("How do I delete my account?"), a: t("Contact our support team at support@twiller.com and they will process your account deletion within 24 hours.") },
    { q: t("Why am I not receiving notifications?"), a: t("Go to Settings → Notifications and ensure the notification toggles are enabled. Also check your browser's notification permissions.") },
    { q: t("How do I report a user or post?"), a: t("Click the ⋯ menu on any post or profile and select 'Report'. Our moderation team reviews all reports.") },
    { q: t("What are interests and how do they work?"), a: t("In your Profile page, add interest topics. When someone posts content matching your interests, you'll receive a personalized notification.") },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div>
      <SectionHeader title="Help Centre" onBack={onBack} />
      <div className="px-4 space-y-6 pb-8">

        {/* Contact Cards */}
        <div>
          <p className="text-[#71767b] text-xs font-semibold uppercase tracking-wider mb-3">{t("Contact Us")}</p>
          <div className="space-y-3">
            <a href="mailto:support@twiller.com" className="flex items-center gap-4 p-4 rounded-2xl bg-[#16181c] border border-[#2f3336] hover:border-[#1d9bf0] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-[#1d9bf0]" />
              </div>
              <div>
                <p className="text-[#e7e9ea] font-semibold group-hover:text-[#1d9bf0] transition-colors">{t("Email Support")}</p>
                <p className="text-[#71767b] text-sm">support@twiller.com</p>
                <p className="text-[#71767b] text-xs mt-0.5">Response within 24 hours</p>
              </div>
            </a>

            <a href="tel:+918007008001" className="flex items-center gap-4 p-4 rounded-2xl bg-[#16181c] border border-[#2f3336] hover:border-[#1d9bf0] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[#00ba7c]/10 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-[#00ba7c]" />
              </div>
              <div>
                <p className="text-[#e7e9ea] font-semibold group-hover:text-[#1d9bf0] transition-colors">{t("Phone Support")}</p>
                <p className="text-[#71767b] text-sm">+91 800-700-8001</p>
                <p className="text-[#71767b] text-xs mt-0.5">Mon–Fri, 9AM–6PM IST</p>
              </div>
            </a>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#16181c] border border-[#2f3336]">
              <div className="w-10 h-10 rounded-full bg-[#7856ff]/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-[#7856ff]" />
              </div>
              <div>
                <p className="text-[#e7e9ea] font-semibold">{t("Office Address")}</p>
                <p className="text-[#71767b] text-sm">Twiller HQ, 14th Floor</p>
                <p className="text-[#71767b] text-sm">Prestige Tech Park, Outer Ring Road</p>
                <p className="text-[#71767b] text-sm">Bengaluru, Karnataka 560103, India</p>
              </div>
            </div>

            <a href="mailto:partnerships@twiller.com" className="flex items-center gap-4 p-4 rounded-2xl bg-[#16181c] border border-[#2f3336] hover:border-[#1d9bf0] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[#ffd400]/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={18} className="text-[#ffd400]" />
              </div>
              <div>
                <p className="text-[#e7e9ea] font-semibold group-hover:text-[#1d9bf0] transition-colors">{t("Business & Partnerships")}</p>
                <p className="text-[#71767b] text-sm">partnerships@twiller.com</p>
                <p className="text-[#71767b] text-xs mt-0.5">For advertising and partnership inquiries</p>
              </div>
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-[#71767b] text-xs font-semibold uppercase tracking-wider mb-3">{t("Frequently Asked Questions")}</p>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-[#2f3336] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="text-[#e7e9ea] font-semibold text-sm">{faq.q}</span>
                  <ChevronRight size={16} className={`text-[#71767b] flex-shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-[#71767b] text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <p className="text-[#71767b] text-xs font-semibold uppercase tracking-wider mb-3">{t("Resources")}</p>
          <div className="space-y-1">
            {[
              { label: t("Terms of Service"), href: "#" },
              { label: t("Privacy Policy"), href: "#" },
              { label: t("Cookie Policy"), href: "#" },
              { label: "Accessibility", href: "#" },
              { label: t("Ads info"), href: "#" },
            ].map(link => (
              <a key={link.label} href={link.href} className="block px-4 py-3 text-[#1d9bf0] hover:underline text-sm rounded-xl hover:bg-white/5 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[#71767b] text-xs">{t("Twiller v2.0 · © 2026 Twiller Inc.")}</p>
          <p className="text-[#71767b] text-xs mt-1">{t("Made with ❤️ in Bengaluru, India")}</p>
        </div>
      </div>
    </div>
  );
}

// ── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [section, setSection] = useState<SettingsSection>("main");
  const [search, setSearch] = useState("");

  const filteredMenu = SETTINGS_MENU.filter(item =>
    search === "" ||
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.desc.toLowerCase().includes(search.toLowerCase())
  );

  if (section !== "main") {
    const props = { onBack: () => setSection("main") };
    let content = null;
    switch (section) {
      case "account":       content = <AccountSection {...props} />; break;
      case "security":      content = <SecuritySection {...props} />; break;
      case "privacy":       content = <PrivacySection {...props} />; break;
      case "notifications": content = <NotificationsSection {...props} />; break;
      case "accessibility": content = <AccessibilitySection {...props} />; break;
      case "display":       content = <DisplaySection {...props} />; break;
      case "additional":    content = <AdditionalSection {...props} />; break;
      case "helpcentre":    content = <HelpCentreSection {...props} />; break;
      case "transactions":  content = <TransactionsSection {...props} />; break;
    }
    return (
      <div key={section} className="animate-page-fade">
        {content}
      </div>
    );
  }

  return (
    <div key="main" className="animate-page-fade min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="px-4 py-3">
          <h1 className="text-xl font-extrabold text-[#e7e9ea] mb-3">{t("settings")}</h1>
          {/* Search */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b] h-4 w-4" />
            <input
              type="text"
              placeholder={t("Search Settings")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-[15px] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] focus:bg-black transition-all border border-transparent focus:border-[#1d9bf0]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b]">
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User info pill */}
      {user && (
        <div className="px-4 py-4 border-b border-[#2f3336]">
          <div className="flex items-center gap-3">
            {user.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(user.avatar)} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
            )}
            <div>
              <p className="text-[#e7e9ea] font-bold">{user.displayName}</p>
              <p className="text-[#71767b] text-sm">@{user.username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="divide-y divide-[#2f3336]">
        {filteredMenu.map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as SettingsSection)}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#16181c] flex items-center justify-center flex-shrink-0">
              <item.icon size={18} className="text-[#e7e9ea]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#e7e9ea] font-semibold text-[15px]">{t(item.label)}</p>
              <p className="text-[#71767b] text-sm mt-0.5 truncate">{t(item.desc)}</p>
            </div>
            <ChevronRight size={18} className="text-[#71767b] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
