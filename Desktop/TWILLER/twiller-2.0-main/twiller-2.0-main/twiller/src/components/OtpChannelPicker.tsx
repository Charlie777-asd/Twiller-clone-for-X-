"use client";
import React from "react";
import { Mail, Smartphone, Bell, X as XIcon } from "lucide-react";

export type OtpChannel = "email" | "mobile" | "both";

interface OtpChannelPickerProps {
  hasEmail: boolean;
  hasPhone: boolean;
  onSelect: (channel: OtpChannel) => void;
  onCancel: () => void;
  onAddPhone?: () => void;
  onAddEmail?: () => void;
  title?: string;
  subtitle?: string;
}

const channels: {
  id: OtpChannel;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  gradient: string;
  color: string;
  border: string;
  bg: string;
  requiresEmail: boolean;
  requiresPhone: boolean;
}[] = [
  {
    id: "email",
    icon: Mail,
    label: "Email",
    desc: "Receive OTP in your inbox",
    gradient: "from-[#1d9bf0]/20 to-[#1d9bf0]/5",
    color: "#1d9bf0",
    border: "border-[#1d9bf0]/40",
    bg: "bg-[#1d9bf0]/10",
    requiresEmail: true,
    requiresPhone: false,
  },
  {
    id: "mobile",
    icon: Smartphone,
    label: "Mobile (WhatsApp)",
    desc: "Receive OTP via WhatsApp SMS",
    gradient: "from-[#25D366]/20 to-[#25D366]/5",
    color: "#25D366",
    border: "border-[#25D366]/40",
    bg: "bg-[#25D366]/10",
    requiresEmail: false,
    requiresPhone: true,
  },
  {
    id: "both",
    icon: Bell,
    label: "Both",
    desc: "Send OTP to email and mobile",
    gradient: "from-[#7856ff]/20 to-[#f91880]/10",
    color: "#7856ff",
    border: "border-[#7856ff]/40",
    bg: "bg-[#7856ff]/10",
    requiresEmail: true,
    requiresPhone: true,
  },
];

import { useLanguage } from "@/context/LanguageContext";

export default function OtpChannelPicker({
  hasEmail,
  hasPhone,
  onSelect,
  onCancel,
  onAddPhone,
  onAddEmail,
  title = "Choose OTP delivery method",
  subtitle = "Where would you like to receive your verification code?",
}: OtpChannelPickerProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#2f3336] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top accent bar */}
        <div
          style={{
            height: "3px",
            background:
              "linear-gradient(90deg, #1d9bf0, #7856ff, #25D366, #1d9bf0)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.5s linear infinite",
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-[#e7e9ea] font-bold text-lg leading-tight">
              {t(title)}
            </h2>
            <p className="text-[#71767b] text-sm mt-1 leading-relaxed">
              {t(subtitle)}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#71767b] transition-colors shrink-0 ml-3 mt-0.5"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Channel options */}
        <div className="px-5 pb-5 space-y-2.5">
          {channels.map((ch) => {
            const needsPhone = ch.requiresPhone && !hasPhone;
            const needsEmail = ch.requiresEmail && !hasEmail;
            const isAvailable = !needsPhone && !needsEmail;
            const isClickable = isAvailable || (needsPhone && !!onAddPhone) || (needsEmail && !!onAddEmail);
            const Icon = ch.icon;

            return (
              <button
                key={ch.id}
                onClick={() => {
                  if (needsPhone && onAddPhone) {
                    onAddPhone();
                    return;
                  }
                  if (needsEmail && onAddEmail) {
                    onAddEmail();
                    return;
                  }
                  onSelect(ch.id);
                }}
                disabled={!isClickable}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
                  ${isClickable
                    ? `${ch.border} hover:bg-gradient-to-r ${ch.gradient} cursor-pointer hover:scale-[1.01] active:scale-[0.99]`
                    : "border-[#2f3336] opacity-40 cursor-not-allowed"
                  }
                  ${!isClickable ? "bg-[#16181c]/50" : "bg-[#16181c]"}
                `}
              >
                {/* Icon bubble */}
                <div
                  className={`w-11 h-11 rounded-full ${ch.bg} flex items-center justify-center shrink-0 border ${ch.border}`}
                >
                  <Icon size={20} style={{ color: ch.color }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#e7e9ea] font-semibold text-[15px] flex items-center gap-2 flex-wrap">
                    {t(ch.label)}
                    {needsPhone && (
                      <span className="text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {onAddPhone ? t("Click to add phone") : t("No phone")}
                      </span>
                    )}
                    {needsEmail && !needsPhone && (
                      <span className="text-[10px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {onAddEmail ? t("Click to add email") : t("No email")}
                      </span>
                    )}
                  </p>
                  <p className="text-[#71767b] text-xs mt-0.5">{t(ch.desc)}</p>
                </div>

                {/* Arrow */}
                {isClickable && (
                  <div
                    className="shrink-0 text-[#71767b]"
                    style={{ color: ch.color, opacity: 0.6 }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-[#71767b] text-sm hover:text-[#e7e9ea] transition-colors"
          >
            {t("Cancel")}
          </button>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
