"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Globe, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { dispatchOtp } from "@/lib/otpService";

interface LanguageSelectorModalProps {
  onClose: () => void;
}

const SUPPORTED_LANGUAGES = ["English", "Spanish", "Hindi", "Portuguese", "Chinese", "French"] as const;
type LanguageType = typeof SUPPORTED_LANGUAGES[number];

export default function LanguageSelectorModal({ onClose }: LanguageSelectorModalProps) {
  const { user, updateUser } = useAuth();
  const { currentLanguage, t } = useLanguage();
  const [step, setStep] = useState<"select" | "otp">("select");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>(currentLanguage as LanguageType);
  const [selectedChannel, setSelectedChannel] = useState<"email" | "mobile" | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageSelect = async (lang: LanguageType) => {
    if (lang === currentLanguage) {
      onClose();
      return;
    }
    setSelectedLanguage(lang);
    setLoading(true);
    setError(null);

    // Auto-select OTP channel based on language:
    // French -> email OTP, all other languages -> mobile OTP
    const autoChannel: "email" | "mobile" = lang === "French" ? "email" : "mobile";
    setSelectedChannel(autoChannel);

    try {
      await dispatchOtp(
        autoChannel,
        user?.email,
        user?.phone,
        () => axiosInstance.post("/language/request-otp", {
          email: user?.email,
          targetLanguage: lang,
          channel: autoChannel,
        })
      );
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.post("/language/verify-otp", {
        email: user?.email,
        targetLanguage: selectedLanguage,
        otp,
      });
      if (res.data?.language) {
        updateUser({ language: res.data.language });
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const otpChannelDesc =
    selectedChannel === "email" ? (
      <>
        We sent a 6-digit OTP to your email:{" "}
        <strong className="text-[#1d9bf0]">
          {user?.email ? maskEmail(user.email) : "your email"}
        </strong>
      </>
    ) : (
      <>
        We sent a 6-digit OTP to your mobile number.
      </>
    );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md bg-black border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {step === "select" ? (t("change_language") || "Change Language") : "Verify OTP"}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-xl text-[#f4212e] text-sm">
              {error}
            </div>
          )}

          {step === "select" ? (
            <div className="space-y-2">
              <p className="text-[#71767b] text-sm mb-3">
                {t("change_language_desc") || "Select your preferred language. A verification code will be sent to confirm the change."}
              </p>
              <div className="mb-4 p-3 bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 rounded-xl text-[#8b98a5] text-xs leading-relaxed">
                🔐 <strong className="text-[#1d9bf0]">French</strong> → OTP sent to <em>email</em>
                &nbsp;|&nbsp;
                <strong className="text-[#1d9bf0]">All others</strong> → OTP sent to <em>mobile</em>
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    currentLanguage === lang
                      ? "border-[#1d9bf0] bg-[#1d9bf0]/5"
                      : "border-[#2f3336] hover:bg-white/5"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center space-x-3">
                    <Globe
                      className={`w-5 h-5 ${
                        currentLanguage === lang ? "text-[#1d9bf0]" : "text-[#71767b]"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        currentLanguage === lang ? "text-[#1d9bf0]" : "text-[#e7e9ea]"
                      }`}
                    >
                      {lang}
                    </span>
                  </div>
                  {currentLanguage === lang ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1d9bf0]" />
                  ) : loading && selectedLanguage === lang ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#1d9bf0]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#71767b]" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[#e7e9ea] font-medium mb-2 leading-relaxed">
                  {otpChannelDesc}
                </p>
                <input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  className="w-full bg-transparent border border-[#2f3336] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] transition-colors"
                  autoFocus
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:bg-[#1570b8] text-white font-bold py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Verify and Change Language"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.slice(0, 2) + "*".repeat(Math.max(0, local.length - 2));
  return `${masked}@${domain}`;
}
