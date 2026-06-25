"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Crown, Star, Shield,
  Clock, ChevronRight, Infinity as InfinityIcon,
  RefreshCw, Sparkles, AlertTriangle, CreditCard
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import LoadingSpinner from "../loading-spinner";

// Payment gateway definitions

// ── Plan definitions ──────────────────────────────────────────────────────────
type PlanId = "free" | "bronze" | "silver" | "gold";


interface Plan {
  id: PlanId;
  name: string;
  price: number;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  icon: React.FC<{ size?: number; style?: React.CSSProperties; className?: string }>;
  tweetLimit: string;
  features: string[];
  cta: string;
  isFree?: boolean;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    color: "#71767b",
    gradientFrom: "#1a1a1a",
    gradientTo: "#111",
    borderColor: "#2f3336",
    icon: Star,
    tweetLimit: "1 tweet / day",
    features: ["1 tweet per day", "Basic feed access", "Like & retweet", "Follow users"],
    cta: "Current Free Plan",
    isFree: true,
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 100,
    color: "#cd7f32",
    gradientFrom: "#1a1208",
    gradientTo: "#110d04",
    borderColor: "#cd7f3240",
    icon: Shield,
    tweetLimit: "3 tweets / day",
    features: ["3 tweets per day", "All Free features", "Priority feed ranking", "Bookmark folders"],
    cta: "Get Bronze — ₹100/mo",
    popular: false,
  },
  {
    id: "silver",
    name: "Silver",
    price: 300,
    color: "#c0c0c0",
    gradientFrom: "#131313",
    gradientTo: "#0d0d0d",
    borderColor: "#c0c0c040",
    icon: Crown,
    tweetLimit: "5 tweets / day",
    features: ["5 tweets per day", "All Bronze features", "Silver checkmark ✔", "Ads-free experience"],
    cta: "Get Silver — ₹300/mo",
    popular: true,
  },
  {
    id: "gold",
    name: "Gold",
    price: 1000,
    color: "#ffd400",
    gradientFrom: "#1a1700",
    gradientTo: "#110f00",
    borderColor: "#ffd40040",
    icon: InfinityIcon,
    tweetLimit: "Unlimited tweets",
    features: ["Unlimited tweets", "All Silver features", "Gold checkmark 🏆", "Creator revenue sharing", "Priority support"],
    cta: "Get Gold — ₹1000/mo",
    popular: false,
  },
];


// ── IST helpers ───────────────────────────────────────────────────────────────
function getISTDate() {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
}

function isWithinPaymentWindow() {
  const ist = getISTDate();
  const totalMin = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return totalMin >= 10 * 60 && totalMin < 11 * 60; // 10:00 AM – 11:00 AM IST
}


function getSecondsUntilWindow() {
  const ist = getISTDate();
  const h = ist.getUTCHours(), m = ist.getUTCMinutes(), s = ist.getUTCSeconds();
  const totalSec = h * 3600 + m * 60 + s;
  const winStart = 10 * 3600, winEnd = 11 * 3600;
  if (totalSec >= winStart && totalSec < winEnd) return 0;
  if (totalSec < winStart) return winStart - totalSec;
  return (24 * 3600 - totalSec) + winStart;
}


function formatCountdown(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

// Checkout script loading

// ── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({
  data,
  onClose,
}: {
  data: { orderId: string; paymentId: string; plan: string; planName: string; amount: number };
  onClose: () => void;
}) {
  const plan = PLANS.find(p => p.id === data.plan);
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center bg-black/80 backdrop-blur-md p-4 pt-12 sm:pt-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden text-center mt-4 sm:mt-0 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-2 sm:p-8 sm:pb-4">
          <div
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-5"
            style={{ background: `${plan?.color}20`, border: `2px solid ${plan?.color}` }}
          >
            <CheckCircle2 className="h-7 w-7 sm:h-9 sm:w-9" style={{ color: plan?.color }} />
          </div>
          <h2 className="text-white font-extrabold text-xl sm:text-2xl mb-1 sm:mb-2">{t("Payment Successful! 🎉")}</h2>
          <p className="text-[#71767b] text-xs sm:text-sm mb-3 sm:mb-5">
            {t("Your")} <strong style={{ color: plan?.color }}>{t(data.planName)}</strong> {t("plan is now active. A detailed invoice has been sent to your email.")}
          </p>
        </div>

        {/* Invoice details */}
        <div className="mx-5 sm:mx-6 bg-[#16181c] rounded-xl p-3.5 sm:p-4 text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-5 border border-[#2f3336]">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#71767b]">{t("Payment ID")}</span>
            <span className="text-white font-mono text-xs truncate max-w-[150px] sm:max-w-[180px]">{data.paymentId}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#71767b]">{t("Order ID")}</span>
            <span className="text-white font-mono text-xs truncate max-w-[150px] sm:max-w-[180px]">{data.orderId}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#71767b]">{t("Plan")}</span>
            <span className="text-white font-bold">{data.planName}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#71767b]">{t("Amount Paid")}</span>
            <span className="font-bold text-[#00ba7c]">₹{data.amount}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#71767b]">{t("Daily Limit")}</span>
            <span className="text-white font-bold">{t(plan?.tweetLimit || "")}</span>
          </div>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full font-extrabold text-black text-[15px] transition-all hover:opacity-90 active:scale-95"
            style={{ background: plan?.color }}
          >
            {t("Start Tweeting!")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  currentPlan,
  onSelect,
}: {
  plan: Plan;
  currentPlan: PlanId;
  onSelect: (plan: Plan) => void;
}) {
  const { t } = useLanguage();
  const isActive = currentPlan === plan.id;

  return (
    <div
      className="relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer hover:scale-[1.02] group"
      style={{
        background: `linear-gradient(135deg, ${plan.gradientFrom} 0%, ${plan.gradientTo} 100%)`,
        borderColor: isActive ? plan.color : plan.borderColor,
        boxShadow: isActive ? `0 0 0 2px ${plan.color}60` : "none",
      }}
      onClick={() => !isActive && !plan.isFree && onSelect(plan)}
    >
      {plan.popular && !isActive && (
        <div className="absolute top-0 right-0 bg-[#1d9bf0] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
          {t("POPULAR")}
        </div>
      )}
      {isActive && (
        <div className="absolute top-0 right-0 bg-[#00ba7c] text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
          <CheckCircle2 size={10} /> {t("ACTIVE")}
        </div>
      )}

      <div className="p-5 flex-1">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${plan.color}20`, border: `1.5px solid ${plan.color}50` }}
          >
            <plan.icon size={16} style={{ color: plan.color }} />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg leading-none">{t(plan.name)}</h3>
            <p className="text-xs mt-0.5" style={{ color: plan.color }}>{t(plan.tweetLimit)}</p>
          </div>
        </div>

        <div className="mb-4">
          {plan.price === 0 ? (
            <span className="text-3xl font-extrabold text-white">{t("Free")}</span>
          ) : (
            <>
              <span className="text-[15px] font-semibold">₹</span>
              <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
              <span className="text-[#71767b] text-[15px]"> /mo</span>
            </>
          )}
        </div>

        <ul className="space-y-2 mb-5">
          {plan.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-[#e7e9ea]">
              <CheckCircle2 size={13} style={{ color: plan.color }} className="flex-shrink-0" />
              {t(f)}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pb-5">
        <button
          disabled={isActive || !!plan.isFree || currentPlan !== "free"}
          onClick={e => { e.stopPropagation(); if (!isActive && !plan.isFree && currentPlan === "free") onSelect(plan); }}
          className="w-full py-2.5 rounded-full font-extrabold text-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: isActive ? `${plan.color}20` : (plan.isFree || currentPlan !== "free") ? "#1a1a1a" : plan.color,
            color: isActive ? plan.color : (plan.isFree || currentPlan !== "free") ? "#536471" : (plan.id === "gold" || plan.id === "silver") ? "#000" : "#fff",
            border: isActive ? `1px solid ${plan.color}` : (plan.isFree || currentPlan !== "free") ? "1px solid #2f3336" : "none",
          }}
        >
          {isActive ? (
            <><CheckCircle2 size={14} />{t("Current Plan")}</>
          ) : plan.isFree ? (
            t("Always Free")
          ) : currentPlan !== "free" ? (
            t("Subscription Locked")
          ) : (
            <>{t(plan.cta)} <ChevronRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface RazorpayOrderData {
  orderId: string;
  planId: PlanId;
  planName: string;
  planColor: string;
  amount: number;
  userEmail: string;
  userPhone: string;
  keyId: string;
  isMock?: boolean;
}

function MockCheckoutModal({
  data,
  onConfirm,
  onClose,
  loading
}: {
  data: RazorpayOrderData;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const plan = PLANS.find(p => p.id === data.planId);
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden text-center">
        {/* Header */}
        <div className="p-6 pb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-white/5 border border-white/10"
            style={{ color: plan?.color }}
          >
            <CreditCard size={28} />
          </div>
          <h2 className="text-white font-extrabold text-xl mb-1">{t("Mock Checkout")}</h2>
          <p className="text-[#71767b] text-xs">
            {t("This instance is running in Mock Mode because no Razorpay API keys are configured.")}
          </p>
        </div>

        {/* Invoice details */}
        <div className="mx-6 bg-[#16181c] rounded-xl p-4 text-left space-y-2 mb-5 border border-[#2f3336]">
          <div className="flex justify-between text-xs">
            <span className="text-[#71767b]">{t("Mock Order ID")}</span>
            <span className="text-white font-mono truncate max-w-[150px] text-xs">{data.orderId}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#71767b]">{t("Plan Selected")}</span>
            <span className="text-white font-bold" style={{ color: plan?.color }}>{data.planName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#71767b]">{t("Prefill Email")}</span>
            <span className="text-white truncate max-w-[150px] text-xs">{data.userEmail}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#71767b]">{t("Amount Due")}</span>
            <span className="font-bold text-[#00ba7c]">₹{data.amount}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 rounded-full font-extrabold text-black text-sm transition-all hover:opacity-90 active:scale-95 bg-[#00ba7c] flex items-center justify-center gap-1.5"
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>{t("Confirm Mock Payment")}</span>
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-2.5 rounded-full font-bold text-white text-xs transition-all hover:bg-white/5 bg-transparent border border-[#2f3336]"
          >
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PremiumPage() {
  const { t } = useLanguage();
  const { user, refreshUser, updateUser } = useAuth();
  const [successData, setSuccessData] = useState<{
    orderId: string; paymentId: string; plan: string; planName: string; amount: number;
  } | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan: PlanId;
    limit: number | null;
    dailyTweetCount: number;
    canTweet: boolean;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [windowOpen, setWindowOpen] = useState(isWithinPaymentWindow());
  const [countdown, setCountdown] = useState(getSecondsUntilWindow());
  const [mockOrderToConfirm, setMockOrderToConfirm] = useState<RazorpayOrderData | null>(null);
  const [confirmingMock, setConfirmingMock] = useState(false);

  const currentPlan: PlanId = (user?.subscription?.plan || "free") as PlanId;

  const fetchStatus = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/subscription/status/${user._id}`);
      setSubscriptionInfo(res.data);
    } catch { /* ignore */ } finally {
      setLoadingStatus(false);
    }
  }, [user?._id]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    const t = setInterval(() => {
      setWindowOpen(isWithinPaymentWindow());
      setCountdown(getSecondsUntilWindow());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleConfirmMockPayment = async () => {
    if (!mockOrderToConfirm || !user) return;
    setConfirmingMock(true);
    try {
      const mockPaymentId = `mock_pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await axiosInstance.post("/api/payments/verify-payment", {
        userId: user._id,
        plan: mockOrderToConfirm.planId,
        razorpay_order_id: mockOrderToConfirm.orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: "mock_signature"
      });

      if (res.data.success) {
        setSuccessData({
          orderId: mockOrderToConfirm.orderId,
          paymentId: mockPaymentId,
          plan: mockOrderToConfirm.planId,
          planName: mockOrderToConfirm.planName,
          amount: mockOrderToConfirm.amount
        });
        updateUser(res.data.user);
        setMockOrderToConfirm(null);
        await refreshUser();
        await fetchStatus();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to verify mock payment.");
    } finally {
      setConfirmingMock(false);
    }
  };

  const handleCancelMockPayment = async () => {
    if (!mockOrderToConfirm) return;
    const orderId = mockOrderToConfirm.orderId;
    setMockOrderToConfirm(null);
    try {
      await axiosInstance.post("/api/payments/mark-failed", {
        orderId,
        failureReason: "Mock checkout cancelled by user"
      });
    } catch (err) {
      console.error("Failed to mark mock payment as failed:", err);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !window.confirm(t("Are you sure you want to cancel your premium subscription?"))) return;
    try {
      const res = await axiosInstance.post("/api/payments/cancel-plan", { userId: user._id });
      if (res.data.success) {
        updateUser(res.data.user);
        await refreshUser();
        await fetchStatus();
        alert(t("Subscription cancelled successfully"));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel subscription");
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;
    setPayError("");

    if (!windowOpen) {
      setPayError(`Payments are only accepted between 10:00 AM – 11:00 AM IST. Window opens in ${formatCountdown(countdown)}.`);
      return;
    }


    setPaying(true);
    try {
      const orderRes = await axiosInstance.post("/api/payments/create-order", {
        userId: user._id,
        plan: plan.id,
      });

      const { orderId, amount, planName, userEmail, userPhone, keyId, isMock } = orderRes.data;

      const orderData: RazorpayOrderData = {
        orderId,
        planId: plan.id,
        planName,
        planColor: plan.color,
        amount,
        userEmail,
        userPhone,
        keyId,
        isMock
      };

      if (isMock) {
        setMockOrderToConfirm(orderData);
      } else {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay SDK. Check your internet connection.");
        }

        const options = {
          key: keyId,
          amount: amount * 100, // in paise
          currency: "INR",
          name: "Twiller Premium",
          description: `${planName} Subscription Plan`,
          order_id: orderId,
          prefill: {
            name: user.displayName || "User",
            email: userEmail,
            contact: userPhone
          },
          handler: async (response: any) => {
            try {
              setPaying(true);
              const verifyRes = await axiosInstance.post("/api/payments/verify-payment", {
                userId: user._id,
                plan: plan.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              if (verifyRes.data.success) {
                setSuccessData({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  plan: plan.id,
                  planName: planName,
                  amount: amount
                });
                updateUser(verifyRes.data.user);
                await refreshUser();
                await fetchStatus();
              }
            } catch (err: any) {
              alert(err.response?.data?.error || "Payment verification failed.");
            } finally {
              setPaying(false);
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                await axiosInstance.post("/api/payments/mark-failed", {
                  orderId,
                  failureReason: "Razorpay payment checkout dismissed by user"
                });
              } catch (err) {
                console.error("Failed to mark payment as failed on dismiss:", err);
              }
            }
          },
          theme: {
            color: plan.color
          }
        };

        const rzp1 = new (window as any).Razorpay(options);
        rzp1.on('payment.failed', async (response: any) => {
          try {
            await axiosInstance.post("/api/payments/mark-failed", {
              orderId,
              failureReason: response.error?.description || "Razorpay payment failed"
            });
          } catch (err) {
            console.error("Failed to mark failed payment:", err);
          }
        });
        rzp1.open();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Failed to initiate checkout order. Please try again.";
      setPayError(msg);
    } finally {
      setPaying(false);
    }
  };



  const activePlan = PLANS.find(p => p.id === currentPlan) || PLANS[0];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-16 md:top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="hidden md:flex text-xl font-extrabold text-[#e7e9ea] items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ffd400]" />
            {t("Subscription Plans")}
          </h1>
          <button
            onClick={() => { setPayError(""); fetchStatus(); refreshUser(); }}
            className="p-2 rounded-full hover:bg-white/5 text-[#71767b] hover:text-white transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Payment Window Banner */}
        <div
          className={`rounded-2xl p-4 flex items-center gap-4 border ${windowOpen
              ? "bg-[#00ba7c]/10 border-[#00ba7c]/30"
              : "bg-[#ffd400]/5 border-[#ffd400]/20"
            }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${windowOpen ? "bg-[#00ba7c]/20" : "bg-[#ffd400]/10"}`}>
            <Clock size={20} className={windowOpen ? "text-[#00ba7c]" : "text-[#ffd400]"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${windowOpen ? "text-[#00ba7c]" : "text-[#ffd400]"}`}>
              {windowOpen ? t("✅ Payment Window is OPEN") : t("⏰ Payment Window: 10:00 AM – 11:00 AM IST")}
            </p>
            <p className="text-[#71767b] text-xs mt-0.5">
              {windowOpen
                ? t("Premium checkout is available now. Window closes at 11:00 AM IST.")
                : <>{t("Payments accepted daily 10:00 AM – 11:00 AM IST.")}{countdown > 0 && <> {t("Opens in:")} <span className="font-mono font-bold text-white">{formatCountdown(countdown)}</span></>}</>
              }
            </p>
          </div>
          {windowOpen && <div className="w-2.5 h-2.5 rounded-full bg-[#00ba7c] animate-pulse flex-shrink-0" />}
        </div>

        {/* Error */}
        {payError && (
          <div className="flex items-start gap-3 p-4 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-2xl">
            <AlertTriangle size={16} className="text-[#f4212e] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#f4212e] font-bold text-sm">{t("Payment Error")}</p>
              <p className="text-[#f4212e]/80 text-xs mt-0.5">{payError}</p>
            </div>
            <button onClick={() => setPayError("")} className="ml-auto text-[#71767b] hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Current Plan Status */}
        {!loadingStatus && subscriptionInfo && (
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: `linear-gradient(135deg, ${activePlan.gradientFrom}, ${activePlan.gradientTo})`,
              borderColor: activePlan.borderColor,
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${activePlan.color}20`, border: `2px solid ${activePlan.color}` }}
                >
                  <activePlan.icon size={22} style={{ color: activePlan.color }} />
                </div>
                <div>
                  <p className="text-white font-extrabold text-lg leading-none">
                    {t(activePlan.name)} {t("Plan")}
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${activePlan.color}20`, color: activePlan.color }}>
                      {t("ACTIVE")}
                    </span>
                  </p>
                  <p className="text-[#71767b] text-xs mt-1">{t(activePlan.tweetLimit)}</p>
                  {user?.subscription?.expiresAt && currentPlan !== "free" && (
                    <p className="text-[#71767b] text-xs">
                      {t("Renews:")} {new Date(user.subscription.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                  {user?.subscription?.orderId && currentPlan !== "free" && (
                    <p className="text-[#536471] text-[10px] font-mono mt-0.5">
                      {t("Order:")} {user.subscription.orderId}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-[#71767b] text-xs mb-1">{t("Today's Usage")}</p>
                <div className="flex items-center gap-2 justify-end">
                  {subscriptionInfo.limit === null ? (
                    <span className="flex items-center gap-1 text-white font-bold">
                      <InfinityIcon size={16} style={{ color: activePlan.color }} />
                      <span className="text-sm" style={{ color: activePlan.color }}>{t("Unlimited")}</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-white font-extrabold text-xl">{subscriptionInfo.dailyTweetCount}</span>
                      <span className="text-[#71767b] text-sm">/ {subscriptionInfo.limit}</span>
                    </>
                  )}
                </div>
                {subscriptionInfo.limit !== null && (
                  <div className="w-24 h-1.5 bg-[#2f3336] rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((subscriptionInfo.dailyTweetCount / (subscriptionInfo.limit || 1)) * 100, 100)}%`,
                        background: subscriptionInfo.canTweet ? activePlan.color : "#f4212e",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            {currentPlan !== "free" && (
              <div className="border-t border-white/10 mt-4 pt-3 flex justify-between items-center">
                <p className="text-[#71767b] text-[11px] leading-snug">
                  {t("You can cancel your subscription at any time to revert back to the free plan.")}
                </p>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-1.5 border border-[#f4212e]/30 hover:bg-[#f4212e]/10 text-[#f4212e] rounded-full text-xs font-bold transition-colors select-none"
                >
                  {t("Cancel Subscription")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mock Checkout Modal Trigger */}
        {mockOrderToConfirm && (
          <MockCheckoutModal
            data={mockOrderToConfirm}
            onConfirm={handleConfirmMockPayment}
            onClose={handleCancelMockPayment}
            loading={confirmingMock}
          />
        )}

        {loadingStatus && <div className="flex justify-center py-4"><LoadingSpinner size="md" /></div>}

        {/* Hero */}
        <div className="text-center py-2">
          <h2 className="text-[#e7e9ea] font-extrabold text-3xl mb-2">{t("Choose your plan")}</h2>
          <p className="text-[#71767b] text-sm max-w-md mx-auto">
            {t("choose_plan_desc")}
          </p>
        </div>

        {/* Paying overlay */}
        {paying && (
          <div className="flex items-center justify-center gap-3 p-4 bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-2xl">
            <LoadingSpinner size="sm" />
            <p className="text-[#1d9bf0] font-semibold text-sm">{t("Opening secure payment gateway...")}</p>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-3 p-4 bg-[#16181c] border border-[#2f3336] rounded-2xl">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[#e7e9ea] text-sm font-bold">{t("🔒 Secured by Razorpay")}</p>
            <p className="text-[#71767b] text-xs text-center">
              {t("Your transaction is processed instantly in a secure environment. If credentials are not configured, a mock mode allows sandbox testing.")}
            </p>
          </div>
        </div>

        {/* Accepted Payments */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["UPI", "Credit/Debit Cards", "Net Banking", "Wallets", "Mock Checkout Mode"].map(m => (
            <span key={m} className="px-3 py-1.5 bg-[#16181c] border border-[#2f3336] rounded-lg text-[#71767b] text-xs font-semibold">
              {m}
            </span>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3 mt-2">
          <h3 className="text-[#e7e9ea] font-extrabold text-lg">{t("Frequently Asked Questions")}</h3>
          {[
            {
              q: "When can I make a payment?",
              a: "Payments are accepted between 10:00 AM and 11:00 AM IST every day. The page shows a live countdown to the window."
            },
            {
              q: "Is my payment information safe?",
              a: "Yes. Payments are processed entirely by the secure Razorpay gateway. We never store your payment credentials."
            },
            {
              q: "What payment methods are accepted?",
              a: "Razorpay accepts UPI, Credit/Debit cards, Net Banking, and Wallets. If the system is in mock mode, it bypasses actual processing."
            },
            {
              q: "How does the daily tweet limit work?",
              a: "Your daily tweet limit resets at midnight IST every day. Free: 1/day — Bronze: 3/day — Silver: 5/day — Gold: Unlimited."
            },
            {
              q: "Will I receive an invoice?",
              a: "Yes! After payment, Razorpay sends an automated receipt, and Twiller updates your account state immediately and sends an email invoice."
            },
            {
              q: "Can I cancel anytime?",
              a: "Subscriptions are monthly and auto-renew. You can cancel directly from your active plan banner above at any time to instantly revert back to the free plan."
            },
          ].map((item, i) => (
            <div key={i} className="bg-[#16181c] rounded-xl p-4 border border-[#2f3336]">
              <p className="text-[#e7e9ea] font-bold text-sm mb-1">{t(item.q)}</p>
              <p className="text-[#71767b] text-xs leading-relaxed">{t(item.a)}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[#536471] text-xs pb-6">
          {t("premium_footer_text")}{" "}
          <a href="#" className="text-[#1d9bf0] hover:underline">{t("Terms of Service")}</a> {t("and")}{" "}
          <a href="#" className="text-[#1d9bf0] hover:underline">{t("Privacy Policy")}</a>.
        </p>
      </div>

      {/* Success Modal */}
      {successData && (
        <SuccessModal data={successData} onClose={() => setSuccessData(null)} />
      )}

    </div>
  );
}


