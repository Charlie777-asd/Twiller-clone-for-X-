"use client";

import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Mail, Phone, ChevronLeft, Check, Camera, UserPlus, ArrowRight } from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getErrorMessage } from "@/lib/types";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { encodeEmailPath, mediaUrl } from "@/lib/backendUrl";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

type LoginMethod = "email" | "phone";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const ALL_LETTERS = UPPERCASE + LOWERCASE;

function generatePassword(length = 14): string {
  let pw = UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)] + LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
  for (let i = 2; i < length; i++) pw += ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

function PasswordStrength({ password }: { password: string }) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const longEnough = password.length >= 10;
  const score = [hasUpper, hasLower, hasDigit || hasSymbol, longEnough].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#f4212e", "#ffd400", "#00ba7c", "#1d9bf0"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i <= score ? colors[score] : "#2f3336" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-full transition-all duration-300"
          style={{ background: i <= current ? "#1d9bf0" : "#2f3336" }}
        />
      ))}
    </div>
  );
}

interface BotUser {
  _id: string;
  displayName: string;
  username: string;
  avatar: string;
  bio?: string;
  verified?: boolean;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, loginWithPhone, signup, signupWithPhone, googlesignin, user, updateUser, verifyLoginOTP } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "", password: "", username: "", displayName: "", dob: "", bio: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupStep, setSignupStep] = useState(1);
  const [suggestedBots, setSuggestedBots] = useState<BotUser[]>([]);
  const [followedBots, setFollowedBots] = useState<Set<string>>(new Set());
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [otpValue, setOtpValue] = useState("");
  const [isChromeOTP, setIsChromeOTP] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState("");
  
  useEffect(() => {
    setMode(initialMode);
    setSignupStep(1);
    setErrors({});
    setFormData({ email: "", phone: "", password: "", username: "", displayName: "", dob: "", bio: "" });
    setAvatarPreview("");
    setAvatarFile(null);
    setAuthStep(1);
    setOtpValue("");
    setIsChromeOTP(false);
    setPendingLoginEmail("");
      }, [initialMode, isOpen]);

  useEffect(() => {
    if (signupStep === 5 && user?._id) {
      axiosInstance.get(`/users/suggestions?userId=${user._id}`)
        .then(res => setSuggestedBots(res.data || []))
        .catch(() => {});
    }
  }, [signupStep, user?._id]);

  if (!isOpen) return null;

  const TOTAL_SIGNUP_STEPS = 5;

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (mode === "login") {
      if (loginMethod === "email") {
        if (!formData.email.trim()) e.email = "Please enter your email.";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email address.";
      } else {
        if (!formData.phone.trim()) e.phone = "Please enter your phone number.";
        else if (!/^\+\d{7,15}$/.test(formData.phone.trim())) e.phone = "Enter number with country code (e.g. +91XXXXXXXXXX).";
      }
      if (!formData.password) e.password = "Please enter your password.";
    } else {
      if (signupStep === 1) {
        if (!formData.displayName.trim()) e.displayName = "Name is required.";
        if (!formData.username.trim()) e.username = "Username is required.";
        else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) e.username = "Letters, numbers, and _ only.";
        if (loginMethod === "email") {
          if (!formData.email.trim()) e.email = "Email is required.";
          else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email address.";
        } else {
          if (!formData.phone.trim()) e.phone = "Phone number is required.";
          else if (!/^\+\d{7,15}$/.test(formData.phone.trim())) e.phone = "Enter number with country code (e.g. +91XXXXXXXXXX).";
        }
      } else if (signupStep === 2) {
        if (!formData.dob) e.dob = "Date of birth is required.";
        else {
          const age = new Date().getFullYear() - new Date(formData.dob).getFullYear();
          if (age < 13) e.dob = "You must be at least 13 years old.";
        }
      } else if (signupStep === 3) {
        if (!formData.password) e.password = "Please choose a password.";
        else if (formData.password.length < 8) e.password = "Password must be at least 8 characters.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhoneSubmit = async () => {
    if (!validateStep() || isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const formattedPhone = formData.phone.startsWith("+") ? formData.phone : "+" + formData.phone.replace(/\D/g, "");
      const res = await axiosInstance.post('/api/auth/send-whatsapp-otp', { phone: formattedPhone });
      if (res.data.success) {
        setAuthStep(2);
      } else {
        throw new Error(res.data.error || "Failed to send OTP");
      }
    } catch (err: unknown) {
      setErrors({ general: getErrorMessage(err, "Failed to send WhatsApp OTP. Please check your number and try again.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAvailability = async (field: "username" | "email" | "phone", value: string) => {
    if (!value.trim()) return;
    try {
      const params: Record<string, string> = {};
      if (field === "username") params.username = value.trim();
      if (field === "email") params.email = value.trim();
      if (field === "phone") params.phone = value.trim();

      const res = await axiosInstance.get("/register/check-exists", { params });
      if (field === "username") {
        if (res.data.usernameExists) {
          setErrors(prev => ({ ...prev, username: "Username already taken." }));
        } else {
          setErrors(prev => {
            const next = { ...prev };
            delete next.username;
            return next;
          });
        }
      }
      if (field === "email") {
        if (res.data.emailExists) {
          setErrors(prev => ({ ...prev, email: "An account with this email already exists." }));
        } else {
          setErrors(prev => {
            const next = { ...prev };
            delete next.email;
            return next;
          });
        }
      }
      if (field === "phone") {
        if (res.data.phoneExists) {
          setErrors(prev => ({ ...prev, phone: "Phone number is already in use." }));
        } else {
          setErrors(prev => {
            const next = { ...prev };
            delete next.phone;
            return next;
          });
        }
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep() || isSubmitting) return;

    if (mode === "signup") {
      if (signupStep === 1) {
        setIsSubmitting(true);
        setErrors({});
        try {
          const params: Record<string, string> = {};
          if (formData.username) params.username = formData.username.trim();
          if (loginMethod === "email" && formData.email) params.email = formData.email.trim();
          if (loginMethod === "phone" && formData.phone) params.phone = formData.phone.trim();

          const res = await axiosInstance.get("/register/check-exists", { params });
          const newErrors: Record<string, string> = {};
          if (res.data.usernameExists) {
            newErrors.username = "Username already taken.";
          }
          if (loginMethod === "email" && res.data.emailExists) {
            newErrors.email = "An account with this email already exists.";
          }
          if (loginMethod === "phone" && res.data.phoneExists) {
            newErrors.phone = "Phone number is already in use.";
          }

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
          }

          setSignupStep(2);
        } catch {
          setErrors({ general: "Failed to verify registration details. Please try again." });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (signupStep < 3) { setSignupStep(s => s + 1); return; }
      if (signupStep === 3) {
        if (loginMethod === "phone" && authStep === 1) {
          await handlePhoneSubmit();
          return;
        }

        setIsSubmitting(true);
        setErrors({});
        try {
          if (loginMethod === "phone" && authStep === 2) {
            if (!otpValue || otpValue.length !== 6) {
              setErrors({ otp: "Please enter the 6-digit code." });
              setIsSubmitting(false);
              return;
            }
                        const formattedPhone = formData.phone.startsWith("+") ? formData.phone : "+" + formData.phone.replace(/\D/g, "");
            const verifyRes = await axiosInstance.post('/api/auth/verify-whatsapp-otp', { phone: formattedPhone, otpCode: otpValue });
            if (!verifyRes.data.success) {
               throw new Error(verifyRes.data.error || "Invalid OTP code");
            }
          }

          if (loginMethod === "email") {
            await signup(formData.email, formData.password, formData.username, formData.displayName);
          } else {
            await signupWithPhone(formData.phone, formData.password, formData.username, formData.displayName, authStep === 2);
          }
          setSignupStep(4);
        } catch (error: unknown) {
          setErrors({ general: getErrorMessage(error, "Something went wrong. Please try again.") });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (signupStep === 4) { setSignupStep(5); return; }
      if (signupStep === 5) { onClose(); return; }
    }

    if (loginMethod === "phone" && authStep === 1) {
      await handlePhoneSubmit();
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      if (loginMethod === "phone" && authStep === 2) {
        if (!otpValue || otpValue.length !== 6) {
          setErrors({ otp: "Please enter the 6-digit code." });
          setIsSubmitting(false);
          return;
        }
                    const formattedPhone = formData.phone.startsWith("+") ? formData.phone : "+" + formData.phone.replace(/\D/g, "");
            const verifyRes = await axiosInstance.post('/api/auth/verify-whatsapp-otp', { phone: formattedPhone, otpCode: otpValue });
            if (!verifyRes.data.success) {
               throw new Error(verifyRes.data.error || "Invalid OTP code");
            }
      }

      if (isChromeOTP) {
        if (!otpValue || otpValue.length !== 6) {
          setErrors({ otp: "Please enter the 6-digit code." });
          setIsSubmitting(false);
          return;
        }
        await verifyLoginOTP(pendingLoginEmail, otpValue);
        onClose();
        return;
      }

      if (loginMethod === "email") {
        const res = await login(formData.email, formData.password);
        if (res?.requireOTP) {
          setPendingLoginEmail(res.email || formData.email);
          setIsChromeOTP(true);
          return;
        }
      } else {
        const res = await loginWithPhone(formData.phone, formData.password, authStep === 2);
        if (res?.requireOTP) {
          setPendingLoginEmail(res.email || "");
          setIsChromeOTP(true);
          return;
        }
      }
      onClose();
    } catch (error: unknown) {
      setErrors({ general: getErrorMessage(error, "Invalid OTP or credentials. Please try again.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfileDetails = async (skip = false) => {
    if (skip) {
      setSignupStep(5);
      return;
    }
    if (!user) {
      setSignupStep(5);
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        const data = new FormData();
        data.append("image", avatarFile);
        const uploadRes = await axiosInstance.post("/upload", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (uploadRes.data?.data?.display_url) {
          avatarUrl = uploadRes.data.data.display_url;
        }
      }
      const updateRes = await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, {
        avatar: avatarUrl,
        bio: formData.bio,
      });
      updateUser(updateRes.data);
      setSignupStep(5);
    } catch (error: unknown) {
      setErrors({ general: getErrorMessage(error, "Failed to update profile details.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    setErrors({});
    try { 
      await googlesignin(); 
      onClose(); 
    } catch (err: unknown) { 
      setErrors({ general: getErrorMessage(err, "Google Sign-In failed.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const change = (field: string, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: "" }));
  };

  const switchToSignup = () => {
    setMode("signup");
    setErrors({});
    setSignupStep(1);
    setFormData({ email: "", phone: "", password: "", username: "", displayName: "", dob: "", bio: "" });
    setAuthStep(1);
    setOtpValue("");
      };

  const switchToLogin = () => {
    setMode("login");
    setErrors({});
    setFormData({ email: "", phone: "", password: "", username: "", displayName: "", dob: "", bio: "" });
    setAuthStep(1);
    setOtpValue("");
    setIsChromeOTP(false);
    setPendingLoginEmail("");
      };

  const handleFollowBot = async (botId: string) => {
    if (!user?._id) return;
    try {
      await axiosInstance.post(`/user/follow/${botId}`, { userId: user._id });
      setFollowedBots(prev => new Set([...prev, botId]));
    } catch { /* ignore */ }
  };

  const inputClass = "peer w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 pt-5 pb-1.5 text-[#e7e9ea] text-[17px] outline-none transition-colors";
  const labelClass = "absolute left-3 top-3 text-[#71767b] text-xs peer-placeholder-shown:text-[17px] peer-placeholder-shown:top-3.5 peer-focus:text-xs peer-focus:top-1.5 peer-focus:text-[#1d9bf0] transition-all pointer-events-none";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#5b7083]/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[600px] bg-black rounded-2xl relative shadow-2xl max-h-[90vh] overflow-y-auto border border-[#2f3336]">

        {/* ══════════ SIGN IN PAGE ══════════ */}
        {mode === "login" && (
          <>
            {/* Top accent for Sign In — blue */}
            <div style={{ height: "4px", background: "linear-gradient(90deg, #1d9bf0, #0e6eb8, #1d9bf0)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite", borderRadius: "16px 16px 0 0" }} />

            {/* Close */}
            <button onClick={onClose} className="absolute top-2.5 left-2.5 z-10 p-3 rounded-full hover:bg-white/10 text-[#e7e9ea] transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="px-8 pb-10 pt-12">
              {/* Logo */}
              <div className="flex justify-center mb-7">
                <div className="w-12 h-12 bg-[#1d9bf0]/10 rounded-full flex items-center justify-center border border-[#1d9bf0]/20">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
              </div>

              <div className="mb-1 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#1d9bf0] rounded-full" />
                <h1 className="text-[#e7e9ea] text-3xl font-extrabold">{t("sign_in_to_x")}</h1>
              </div>
              <p className="text-[#71767b] text-sm mb-7 ml-3.5">{t("Welcome back! Enter your details to continue.")}</p>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center space-x-2 bg-[#16181c] hover:bg-[#1e2124] text-[#e7e9ea] font-bold py-3 rounded-xl transition-colors text-[15px] mb-3 border border-[#2f3336]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>{t("sign_up_google")}</span>
              </button>

              <div className="flex items-center my-5">
                <div className="flex-1 h-px bg-[#2f3336]" />
                <span className="mx-4 text-[#71767b] text-sm font-medium">{t("or sign in with")}</span>
                <div className="flex-1 h-px bg-[#2f3336]" />
              </div>

              {/* Login method toggle */}
              <div className="flex bg-[#0d0d0d] rounded-xl p-1 mb-5 border border-[#2f3336] gap-1">
                {(["email", "phone"] as LoginMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setLoginMethod(m); setErrors({}); setAuthStep(1); setOtpValue(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMethod === m ? "bg-[#1d9bf0] text-white shadow-sm" : "text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/5"}`}
                  >
                    {m === "email" ? <Mail size={14} /> : <Phone size={14} />}
                    {m === "email" ? t("email") : t("phone")}
                  </button>
                ))}
              </div>

              {errors.general && (
                <div className="mb-4 p-3 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-xl text-[#f4212e] text-sm">
                  <p>{errors.general}</p>
                  {(errors.general.toLowerCase().includes("twilio") || errors.general.toLowerCase().includes("sandbox") || errors.general.toLowerCase().includes("whatsapp")) && (
                    <div className="mt-2 p-2 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                      <p className="text-[#8b98a5] text-xs leading-relaxed">
                        To receive verification OTPs on your mobile device, please make sure you join our Twilio sandbox.
                      </p>
                      <a
                        href="https://wa.me/14155238886?text=join%20bone-couple"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25D366] text-xs font-bold underline mt-1 block"
                      >
                        Tap here to join Twilio Sandbox →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {authStep === 1 && !isChromeOTP && (
                  <>
                    {loginMethod === "email" ? (
                      <div className="relative">
                        <input type="email" placeholder=" " id="login-email" value={formData.email} onChange={e => change("email", e.target.value)} className={inputClass} disabled={isSubmitting} />
                        <label htmlFor="login-email" className={labelClass}>{t("Email address")}</label>
                        {errors.email && <p className="text-[#f4212e] text-xs mt-1">{errors.email}</p>}
                      </div>
                    ) : (
                      <>
                        {/* WhatsApp sandbox + channel info */}
                        <div style={{ marginBottom: "12px" }}>
                          <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-3 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              </div>
                              <p className="text-[#e7e9ea] text-xs font-bold">{t("otp_delivered_whatsapp") || "OTP delivered via WhatsApp"}</p>
                            </div>
                            <p className="text-[#71767b] text-xs leading-relaxed mb-2">
                              {t("whatsapp_sandbox_instruction") || "Your verification code will be sent to your WhatsApp. You must join our sandbox first to receive it."}
                            </p>
                            <a href="https://wa.me/14155238886?text=join%20bone-couple" target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2 px-3 rounded-lg transition-colors text-xs w-full justify-center"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              {t("join_whatsapp_sandbox_once") || "Join WhatsApp Sandbox (One-time)"}
                            </a>
                          </div>
                        </div>
                        <div className="relative">
                          <input type="tel" placeholder=" " id="login-phone" value={formData.phone} onChange={e => change("phone", e.target.value)} className={inputClass} disabled={isSubmitting} />
                          <label htmlFor="login-phone" className={labelClass}>Phone number (with country code)</label>
                          {errors.phone && <p className="text-[#f4212e] text-xs mt-1">{errors.phone}</p>}
                        </div>
                      </>
                    )}

                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder=" " id="login-password" value={formData.password} onChange={e => change("password", e.target.value)} className={`${inputClass} pr-12`} disabled={isSubmitting} />
                      <label htmlFor="login-password" className={labelClass}>{t("Password")}</label>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-[#71767b] hover:text-[#e7e9ea] rounded-full hover:bg-white/5 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      {errors.password && <p className="text-[#f4212e] text-xs mt-1">{errors.password}</p>}
                    </div>

                    <div className="flex justify-end">
                      <button type="button" className="text-[#1d9bf0] text-sm hover:underline" onClick={() => { onClose(); router.push("/forgot-password"); }}>
                        {t("forgot_password")}
                      </button>
                    </div>
                  </>
                )}

                {isChromeOTP && (
                  <div className="space-y-4">
                    <p className="text-[#e7e9ea] text-sm font-semibold text-center mt-2 mb-4">{t("chrome_otp_email_desc") || "We detected you are logging in from Google Chrome. A 6-digit verification code has been sent to your email."}</p>
                    <div className="relative mt-2">
                      <input type="text" placeholder=" " id="chrome-otp" value={otpValue} onChange={e => setOtpValue(e.target.value)} className={inputClass} disabled={isSubmitting} maxLength={6} />
                      <label htmlFor="chrome-otp" className={labelClass}>6-digit OTP</label>
                      {errors.otp && <p className="text-[#f4212e] text-xs mt-1">{errors.otp}</p>}
                    </div>
                  </div>
                )}

                {loginMethod === "phone" && authStep === 2 && (
                  <div className="space-y-4">
                      <p className="text-[#e7e9ea] text-sm font-semibold text-center mt-2 mb-4">{t("whatsapp_code_dispatched") || "We dispatched a verification code via WhatsApp to your mobile device."}</p>
                    <div className="relative mt-2">
                      <input type="text" placeholder=" " id="login-otp" value={otpValue} onChange={e => setOtpValue(e.target.value)} className={inputClass} disabled={isSubmitting} maxLength={6} />
                      <label htmlFor="login-otp" className={labelClass}>6-digit OTP</label>
                      {errors.otp && <p className="text-[#f4212e] text-xs mt-1">{errors.otp}</p>}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-extrabold py-3.5 rounded-xl text-[17px] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-[#1d9bf0]/20"
                >
                  {isSubmitting ? <><LoadingSpinner size="sm" /><span>Signing in…</span></> : <><span>{isChromeOTP ? "Verify Login" : (loginMethod === "phone" ? (authStep === 1 ? "Send OTP" : "Verify & Complete") : t("sign_in"))}</span><ArrowRight className="h-5 w-5" /></>}
                </button>
              </form>

              {/* Divider — clear separation from Create Account */}
              <div className="mt-8 pt-6 border-t border-[#2f3336]">
                <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-4 border border-[#2f3336]">
                  <div>
                    <p className="text-[#e7e9ea] text-sm font-bold">{t("New to X?")}</p>
                    <p className="text-[#71767b] text-xs mt-0.5">{t("Create your account in minutes")}</p>
                  </div>
                  <button
                    onClick={switchToSignup}
                    className="flex items-center gap-2 bg-transparent border border-[#1d9bf0] text-[#1d9bf0] font-bold py-2 px-5 rounded-full hover:bg-[#1d9bf0]/10 transition-colors text-sm"
                  >
                    <UserPlus size={15} />
                    {t("create_account")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════ CREATE ACCOUNT PAGE ══════════ */}
        {mode === "signup" && (
          <>
            {/* Top accent for Create Account — purple/green gradient */}
            <div style={{ height: "4px", background: "linear-gradient(90deg, #7856ff, #00ba7c, #f91880, #7856ff)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite", borderRadius: "16px 16px 0 0" }} />

            {/* Close */}
            <button onClick={onClose} className="absolute top-2.5 left-2.5 z-10 p-3 rounded-full hover:bg-white/10 text-[#e7e9ea] transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="px-8 pb-10 pt-12">
              {/* Back button for steps 2+ */}
              {signupStep > 1 && signupStep <= 3 && (
                <button
                  type="button"
                  onClick={() => { setSignupStep(s => s - 1); setErrors({}); }}
                  className="flex items-center gap-2 text-[#71767b] hover:text-[#e7e9ea] mb-4 transition-colors text-sm"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              {/* Step progress */}
              {signupStep <= 3 && <StepProgress current={signupStep - 1} total={TOTAL_SIGNUP_STEPS} />}
              {signupStep === 4 && <StepProgress current={3} total={TOTAL_SIGNUP_STEPS} />}
              {signupStep === 5 && <StepProgress current={4} total={TOTAL_SIGNUP_STEPS} />}

              {/* Logo + heading — distinct from Sign In */}
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7856ff]/20 to-[#00ba7c]/20 rounded-full flex items-center justify-center border border-[#7856ff]/30">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
              </div>

              <div className="mb-1 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#7856ff] to-[#00ba7c] rounded-full" />
                <h1 className="text-[#e7e9ea] text-3xl font-extrabold">
                  {signupStep === 1 && t("create_your_account")}
                  {signupStep === 2 && "When's your birthday?"}
                  {signupStep === 3 && "You'll need a password"}
                  {signupStep === 4 && "Pick a profile picture"}
                  {signupStep === 5 && "Follow some accounts"}
                </h1>
              </div>
              <p className="text-[#71767b] text-sm mb-6 ml-3.5">
                {signupStep === 1 && "Tell us about you to get started."}
                {signupStep === 2 && "This won't be public. Confirm your own age."}
                {signupStep === 3 && "Make sure it's 8 characters or more."}
                {signupStep === 4 && "Have a favourite selfie? Upload it now."}
                {signupStep === 5 && "Follow at least 3 accounts you find interesting."}
              </p>

              {errors.general && (
                <div className="mb-4 p-3 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-xl text-[#f4212e] text-sm">
                  <p>{errors.general}</p>
                  {(errors.general.toLowerCase().includes("twilio") || errors.general.toLowerCase().includes("sandbox") || errors.general.toLowerCase().includes("whatsapp")) && (
                    <div className="mt-2 p-2 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
                      <p className="text-[#8b98a5] text-xs leading-relaxed">
                        To receive verification OTPs on your mobile device, please make sure you join our Twilio sandbox.
                      </p>
                      <a
                        href="https://wa.me/14155238886?text=join%20bone-couple"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25D366] text-xs font-bold underline mt-1 block"
                      >
                        Tap here to join Twilio Sandbox →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 1: Basic Info ─── */}
              {signupStep === 1 && (
                <>
                  <button
                    onClick={handleGoogle}
                    className="w-full flex items-center justify-center space-x-2 bg-[#16181c] hover:bg-[#1e2124] text-[#e7e9ea] font-bold py-3 rounded-xl transition-colors text-[15px] mb-4 border border-[#2f3336]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>{t("sign_up_google")}</span>
                  </button>

                  <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-[#2f3336]" />
                    <span className="mx-4 text-[#71767b] text-sm font-medium">or fill in details</span>
                    <div className="flex-1 h-px bg-[#2f3336]" />
                  </div>

                  {/* Method toggle */}
                  <div className="flex bg-[#0d0d0d] rounded-xl p-1 mb-4 border border-[#2f3336] gap-1">
                    {(["email", "phone"] as LoginMethod[]).map(m => (
                      <button key={m} type="button" onClick={() => { setLoginMethod(m); setErrors({}); setAuthStep(1); setOtpValue(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMethod === m ? "bg-[#1d9bf0] text-white shadow-sm" : "text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/5"}`}
                      >
                        {m === "email" ? <Mail size={14} /> : <Phone size={14} />}
                        {m === "email" ? t("email") : t("phone")}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <input type="text" placeholder=" " id="signup-name" value={formData.displayName} onChange={e => change("displayName", e.target.value)} className={inputClass} />
                      <label htmlFor="signup-name" className={labelClass}>Name</label>
                      {errors.displayName && <p className="text-[#f4212e] text-xs mt-1">{errors.displayName}</p>}
                    </div>
                    <div className="relative">
                      <input type="text" placeholder=" " id="signup-username" value={formData.username} onChange={e => change("username", e.target.value)} onBlur={() => checkAvailability("username", formData.username)} className={inputClass} />
                      <label htmlFor="signup-username" className={labelClass}>Username</label>
                      {errors.username && <p className="text-[#f4212e] text-xs mt-1">{errors.username}</p>}
                    </div>
                    {loginMethod === "email" ? (
                      <div className="relative">
                        <input type="email" placeholder=" " id="signup-email" value={formData.email} onChange={e => change("email", e.target.value)} onBlur={() => checkAvailability("email", formData.email)} className={inputClass} />
                        <label htmlFor="signup-email" className={labelClass}>Email address</label>
                        {errors.email && <p className="text-[#f4212e] text-xs mt-1">{errors.email}</p>}
                      </div>
                    ) : (
                      <>
                        {/* WhatsApp sandbox + channel info (signup) */}
                        <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-3 mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </div>
                            <p className="text-[#e7e9ea] text-xs font-bold">{t("otp_will_be_sent_whatsapp") || "OTP will be sent via WhatsApp"}</p>
                          </div>
                          <p className="text-[#71767b] text-xs leading-relaxed mb-2">
                            {t("whatsapp_sandbox_signup_desc") || "Join our WhatsApp sandbox first to receive your OTP. This is a one-time setup required for phone-based accounts."}
                          </p>
                          <a href="https://wa.me/14155238886?text=join%20bone-couple" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2 px-3 rounded-lg transition-colors text-xs w-full justify-center"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            {t("join_whatsapp_sandbox_once") || "Join WhatsApp Sandbox (One-time)"}
                          </a>
                        </div>
                        <div className="relative">
                          <input type="tel" placeholder=" " id="signup-phone" value={formData.phone} onChange={e => change("phone", e.target.value)} onBlur={() => checkAvailability("phone", formData.phone)} className={inputClass} />
                          <label htmlFor="signup-phone" className={labelClass}>Phone number (with country code)</label>
                          {errors.phone && <p className="text-[#f4212e] text-xs mt-1">{errors.phone}</p>}
                        </div>
                      </>
                    )}
                    <button type="submit" className="w-full bg-[#e7e9ea] hover:bg-white text-black font-extrabold py-3.5 rounded-xl text-[17px] transition-colors mt-2 flex items-center justify-center gap-2">
                      {t("next")} <ArrowRight className="h-5 w-5" />
                    </button>
                  </form>

                  <p className="text-[#71767b] text-xs mt-4 text-center leading-relaxed">
                    {t("by_signing_up")}
                  </p>

                  {/* Clear separation — already have account */}
                  <div className="mt-6 pt-5 border-t border-[#2f3336]">
                    <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-4 border border-[#2f3336]">
                      <div>
                        <p className="text-[#e7e9ea] text-sm font-bold">Already on X?</p>
                        <p className="text-[#71767b] text-xs mt-0.5">Sign in to your existing account</p>
                      </div>
                      <button
                        onClick={switchToLogin}
                        className="flex items-center gap-2 bg-transparent border border-[#536471] text-[#e7e9ea] font-bold py-2 px-5 rounded-full hover:bg-white/5 transition-colors text-sm"
                      >
                        {t("sign_in")}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ─── STEP 2: Date of Birth ─── */}
              {signupStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[#71767b] text-xs font-semibold mb-2 uppercase tracking-wider">Date of birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={e => change("dob", e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3.5 text-[#e7e9ea] text-[17px] outline-none transition-colors appearance-none"
                      style={{ colorScheme: "dark" }}
                    />
                    {errors.dob && <p className="text-[#f4212e] text-xs mt-1">{errors.dob}</p>}
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#2f3336] rounded-xl p-4">
                    <p className="text-[#e7e9ea] text-sm font-semibold mb-1">Why do we ask?</p>
                    <p className="text-[#71767b] text-xs leading-relaxed">This information is used to calculate your age. You can choose whether to make it public in account settings.</p>
                  </div>
                  <button type="submit" className="w-full bg-[#e7e9ea] hover:bg-white text-black font-extrabold py-3.5 rounded-xl text-[17px] transition-colors flex items-center justify-center gap-2">
                    Next <ArrowRight className="h-5 w-5" />
                  </button>
                </form>
              )}

              {/* ─── STEP 3: Password ─── */}
              {signupStep === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {authStep === 1 && (
                    <>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder=" " id="signup-password" value={formData.password} onChange={e => change("password", e.target.value)} className={`${inputClass} pr-12`} disabled={isSubmitting} />
                        <label htmlFor="signup-password" className={labelClass}>Password</label>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-[#71767b] hover:text-[#e7e9ea] rounded-full hover:bg-white/5 transition-colors">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        {errors.password && <p className="text-[#f4212e] text-xs mt-1">{errors.password}</p>}
                      </div>
                      <PasswordStrength password={formData.password} />

                      <button
                        type="button"
                        onClick={() => change("password", generatePassword())}
                        className="text-[#7856ff] text-sm hover:underline flex items-center gap-1 mt-2"
                      >
                        ✨ Generate secure password
                      </button>
                    </>
                  )}

                  {loginMethod === "phone" && authStep === 2 && (
                    <div className="space-y-4">
                        <p className="text-[#e7e9ea] text-sm font-semibold text-center mt-2 mb-4">{t("whatsapp_code_dispatched") || "We dispatched a verification code via WhatsApp to your mobile device."}</p>
                      <div className="relative mt-2">
                        <input type="text" placeholder=" " id="signup-otp" value={otpValue} onChange={e => setOtpValue(e.target.value)} className={inputClass} disabled={isSubmitting} maxLength={6} />
                        <label htmlFor="signup-otp" className={labelClass}>6-digit OTP</label>
                        {errors.otp && <p className="text-[#f4212e] text-xs mt-1">{errors.otp}</p>}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#e7e9ea] hover:bg-white text-black font-extrabold py-3.5 rounded-xl text-[17px] transition-colors disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <><LoadingSpinner size="sm" /><span>Creating account…</span></> : <><span>{loginMethod === "phone" ? (authStep === 1 ? "Send OTP" : "Verify & Complete") : "Create account"}</span><ArrowRight className="h-5 w-5" /></>}
                  </button>
                </form>
              )}

              {/* ─── STEP 4: Profile Picture ─── */}
              {signupStep === 4 && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer">
                      <div className="w-28 h-28 rounded-full bg-[#16181c] border-2 border-[#2f3336] overflow-hidden flex items-center justify-center">
                        {avatarPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-10 h-10 text-[#71767b]" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }}
                      />
                    </div>
                    <p className="text-[#71767b] text-sm text-center">Click to add a profile photo</p>
                  </div>

                  <div className="relative">
                    <textarea
                      placeholder="Tell the world about yourself (optional)"
                      value={formData.bio}
                      onChange={e => change("bio", e.target.value)}
                      maxLength={160}
                      rows={3}
                      className="w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 py-3 text-[#e7e9ea] text-[15px] outline-none transition-colors resize-none placeholder-[#71767b]"
                    />
                    <span className="absolute bottom-2 right-3 text-[#71767b] text-xs">{formData.bio.length}/160</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveProfileDetails(true)}
                      className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-3 rounded-xl hover:bg-white/5 transition-colors text-sm disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveProfileDetails(false)}
                      className="flex-1 bg-[#e7e9ea] hover:bg-white text-black font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <LoadingSpinner size="sm" /> : <>Next <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 5: Follow Suggestions ─── */}
              {signupStep === 5 && (
                <div className="space-y-4">
                  <p className="text-[#71767b] text-sm text-center">Here are some popular accounts to get you started.</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(suggestedBots.length > 0 ? suggestedBots : [
                      { _id: "bot1", displayName: "Tech Insider", username: "techbot", avatar: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400", bio: "Your daily dose of technology news 🤖💻", verified: true },
                      { _id: "bot2", displayName: "Science Daily", username: "sciencedaily", avatar: "https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg?auto=compress&cs=tinysrgb&w=400", bio: "Exploring frontiers of science 🔬🧬", verified: true },
                      { _id: "bot3", displayName: "Sports Update", username: "sportsupdate", avatar: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=400", bio: "Live sports coverage ⚽🏏", verified: true },
                      { _id: "bot4", displayName: "Music Vibes", username: "musicvibes", avatar: "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg?auto=compress&cs=tinysrgb&w=400", bio: "New music, artist interviews 🎵🎸", verified: true },
                      { _id: "bot5", displayName: "Travel World", username: "travelworld", avatar: "https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=400", bio: "Explore the world ✈️🌏", verified: false },
                    ]).map(bot => (
                      <div key={bot._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-[#2f3336]">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(bot.avatar)} alt={bot.displayName} className="w-12 h-12 rounded-full object-cover" />
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-[#e7e9ea] font-bold text-[15px]">{bot.displayName}</p>
                              {bot.verified && (
                                <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0]">
                                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                </svg>
                              )}
                            </div>
                            <p className="text-[#71767b] text-sm">@{bot.username}</p>
                            {bot.bio && <p className="text-[#e7e9ea] text-xs mt-0.5 line-clamp-1">{bot.bio}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowBot(bot._id)}
                          className={`flex-shrink-0 font-bold rounded-full px-4 py-1.5 text-sm transition-colors flex items-center gap-1.5 ${
                            followedBots.has(bot._id)
                              ? "border border-[#536471] text-[#e7e9ea]"
                              : "bg-[#e7e9ea] text-black hover:bg-white"
                          }`}
                        >
                          {followedBots.has(bot._id) ? <><Check size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-extrabold py-3.5 rounded-xl text-[17px] transition-colors"
                  >
                    Let&apos;s go! 🚀
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div id="recaptcha-container"></div>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}
