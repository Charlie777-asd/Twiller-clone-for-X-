"use client";

import React, { useState } from "react";
import AuthModal from "./Authmodel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Feed from "./Feed";
import LoadingSpinner from "./loading-spinner";

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user, isLoading, googlesignin } = useAuth();
  const { t } = useLanguage();

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white mx-auto mb-4">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (user) return <Feed />;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Left side — X logo */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-black relative overflow-hidden">
        {/* Background subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1d9bf0]/5 via-transparent to-transparent" />
        <svg
          viewBox="0 0 24 24"
          className="fill-white w-[380px] h-[380px] relative z-10 drop-shadow-2xl"
          aria-label="X"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Right side — CTA */}
      <div className="flex-1 lg:flex-none lg:w-[600px] flex flex-col justify-center px-8 sm:px-16 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <svg viewBox="0 0 24 24" className="fill-white w-10 h-10">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        <div className="max-w-[380px]">
          <h1 className="text-[64px] font-extrabold leading-none mb-8 tracking-tight">
            {t("happening_now")}
          </h1>
          <h2 className="text-3xl font-extrabold mb-8">{t("join_today")}</h2>

          <div className="space-y-3 mb-6">
            {/* Google Sign Up */}
            <button
              onClick={() => googlesignin()}
              className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-100 text-black font-bold py-2.5 px-4 rounded-full transition-colors text-[15px] border border-transparent"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{t("sign_up_google")}</span>
            </button>

            {/* Apple Sign Up */}
            <button className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-100 text-black font-bold py-2.5 px-4 rounded-full transition-colors text-[15px]">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span>{t("sign_up_apple")}</span>
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2f3336]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black px-3 text-[#71767b] text-[13px] font-medium">
                  or
                </span>
              </div>
            </div>

            {/* Create account */}
            <button
              onClick={() => openAuthModal("signup")}
              className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-2.5 px-4 rounded-full transition-colors text-[15px]"
            >
              {t("create_account")}
            </button>
          </div>

          <p className="text-[#71767b] text-xs leading-relaxed mb-10">
            {t("by_signing_up")}
          </p>

          {/* Sign in section */}
          <div>
            <p className="text-[#e7e9ea] text-xl font-bold mb-5">
              {t("already_have_account")}
            </p>
            <button
              onClick={() => openAuthModal("login")}
              className="w-full border border-[#536471] hover:bg-[#1d9bf0]/10 text-[#1d9bf0] font-bold py-2.5 px-4 rounded-full transition-colors text-[15px]"
            >
              {t("sign_in")}
            </button>
          </div>
        </div>
      </div>



      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}
