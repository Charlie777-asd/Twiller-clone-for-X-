"use client";

import React, { useState, useEffect } from "react";
import { Crown, Shield, X, ChevronRight, Infinity as InfinityIcon } from "lucide-react";

interface LimitDetail {
  plan: string;
  limit: number;
  planLabel: string;
}

const UPGRADE_PLANS = [
  { id: "bronze", name: "Bronze", price: "₹100/mo", limit: "3 tweets/day", color: "#cd7f32", icon: Shield },
  { id: "silver", name: "Silver", price: "₹300/mo", limit: "5 tweets/day",  color: "#c0c0c0", icon: Crown },
  { id: "gold",   name: "Gold",   price: "₹1000/mo", limit: "Unlimited", color: "#ffd400", icon: InfinityIcon },
];


export default function TweetLimitModal({ onNavigatePremium }: { onNavigatePremium: () => void }) {
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState<LimitDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<LimitDetail>;
      setDetail(customEvent.detail);
      setShow(true);
    };
    window.addEventListener("twiller-tweet-limit", handler);
    return () => window.removeEventListener("twiller-tweet-limit", handler);
  }, []);

  if (!show || !detail) return null;

  const nextUpgrades = UPGRADE_PLANS.filter(p =>
    detail.plan === "free" || (detail.plan === "bronze" && ["silver","gold"].includes(p.id)) || (detail.plan === "silver" && p.id === "gold")
  );


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#1a1400] to-[#0d0d0d] border-b border-[#2f3336] px-5 py-4 text-center">
          <button
            onClick={() => setShow(false)}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-[#71767b] transition-colors"
          >
            <X size={15} />
          </button>
          <div className="w-14 h-14 rounded-full bg-[#ffd400]/10 border border-[#ffd400]/30 flex items-center justify-center mx-auto mb-3">
            <Crown size={24} className="text-[#ffd400]" />
          </div>
          <h2 className="text-white font-extrabold text-xl">Daily Limit Reached</h2>
          <p className="text-[#71767b] text-sm mt-1">
            Your <strong className="text-[#e7e9ea]">{detail.planLabel}</strong> plan allows{" "}
            <strong className="text-[#1d9bf0]">{detail.limit} tweet{detail.limit > 1 ? "s" : ""}/day</strong>.
          </p>
        </div>

        {/* Upgrade options */}
        <div className="p-4 space-y-2">
          <p className="text-[#71767b] text-xs font-semibold uppercase tracking-wider mb-3">Upgrade to tweet more</p>
          {nextUpgrades.map(plan => (
            <button
              key={plan.id}
              onClick={() => { setShow(false); onNavigatePremium(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] text-left"
              style={{ borderColor: `${plan.color}30`, background: `${plan.color}08` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${plan.color}20` }}
              >
                <plan.icon size={15} style={{ color: plan.color }} />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-none">{plan.name}</p>
                <p className="text-[#71767b] text-xs mt-0.5">{plan.limit} · {plan.price}</p>
              </div>
              <ChevronRight size={14} className="text-[#71767b]" />
            </button>
          ))}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => setShow(false)}
            className="w-full py-2.5 rounded-full border border-[#2f3336] text-[#71767b] text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
