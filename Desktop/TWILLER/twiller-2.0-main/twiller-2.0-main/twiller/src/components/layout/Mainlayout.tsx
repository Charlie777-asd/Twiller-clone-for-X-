"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "../loading-spinner";
import Sidebar, { type Page } from "./Sidebar";
import RightSidebar from "./Rightsidebar";
import ProfilePage from "../ProfilePage";
import NotificationToast from "../NotificationToast";
import TweetLimitModal from "../TweetLimitModal";
import Feed from "../Feed";
import dynamic from "next/dynamic";
import { Home, Search, Bell, Mail, User, Feather, Settings, Bookmark, List, HelpCircle, Globe, LogOut, X, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelectorModal from "../LanguageSelectorModal";

import ExplorePage from "../pages/ExplorePage";
import NotificationsPage from "../pages/NotificationsPage";
import MessagesPage from "../pages/MessagesPage";
import BookmarksPage from "../pages/BookmarksPage";
import ListsPage from "../pages/ListsPage";
import PremiumPage from "../pages/PremiumPage";
import SettingsPage from "../pages/SettingsPage";
import HelpDeskPage from "../pages/HelpDeskPage";

import UserProfilePage from "../pages/UserProfilePage";

const FULL_WIDTH_PAGES: string[] = ["messages", "settings", "helpdesk"];
const NO_RIGHT_SIDEBAR: string[] = ["messages", "settings", "premium", "helpdesk"];

function PageContent({ page, viewUserId, onNavigate }: { page: Page | "userProfile"; viewUserId: string | null; onNavigate: (p: Page) => void }) {
  switch (page) {
    case "home":          return <Feed />;
    case "explore":       return <ExplorePage />;
    case "notifications": return <NotificationsPage />;
    case "messages":      return <MessagesPage />;
    case "bookmarks":     return <BookmarksPage />;
    case "lists":         return <ListsPage onNavigate={onNavigate} />;
    case "premium":       return <PremiumPage />;
    case "settings":      return <SettingsPage />;
    case "helpdesk":      return <HelpDeskPage />;
    case "profile":       return <ProfilePage />;
    case "userProfile":   return viewUserId ? <UserProfilePage userId={viewUserId} onBack={() => onNavigate("home")} /> : <Feed />;
    default:              return <Feed />;
  }
}

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page | "userProfile">("home");
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/notifications/${user._id}`);
      const list = res.data || [];
      const unread = list.filter((n: { isRead: boolean }) => !n.isRead).length;
      setNotifCount(unread);
    } catch { /* ignore */ }
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, user]);

  useEffect(() => {
    if (currentPage === "notifications") {
      setNotifCount(0);
    }
  }, [currentPage]);

  // Inject theme styles dynamically based on user preferences
  useEffect(() => {
    if (!user) return;

    // 1. Accent Color
    const accent = user.displayPrefs?.colorAccent || "#1d9bf0";
    const accentHovers: Record<string, string> = {
      "#1d9bf0": "#1a8cd8",
      "#ffd400": "#e6be00",
      "#f91880": "#e01673",
      "#7856ff": "#6546d7",
      "#ff7a00": "#e66e00",
      "#00ba7c": "#00a36c",
    };
    const accentHover = accentHovers[accent] || accent;
    document.documentElement.style.setProperty("--theme-accent", accent);
    document.documentElement.style.setProperty("--theme-accent-hover", accentHover);

    // 2. Background Theme
    const bgTheme = user.displayPrefs?.backgroundTheme || "default";
    let bg = "#000000";
    let containerBg = "#16181c";
    let text = "#e7e9ea";
    let textMuted = "#71767b";
    let border = "#2f3336";

    if (bgTheme === "dim") {
      bg = "#15202b";
      containerBg = "#1e2732";
      text = "#ffffff";
      textMuted = "#8899a6";
      border = "#38444d";
    }

    // 3. High Contrast
    const highContrast = user.accessibilityPrefs?.highContrast ?? false;
    if (highContrast) {
      if (bgTheme === "dim") {
        border = "#5c6e7e";
        textMuted = "#bdc5cd";
      } else {
        border = "#536471";
        textMuted = "#a6aab0";
      }
    }

    document.documentElement.style.setProperty("--theme-bg", bg);
    document.documentElement.style.setProperty("--theme-container-bg", containerBg);
    document.documentElement.style.setProperty("--theme-text", text);
    document.documentElement.style.setProperty("--theme-text-muted", textMuted);
    document.documentElement.style.setProperty("--theme-border", border);

    // 4. Font Size Scale
    const fontSize = user.displayPrefs?.fontSize ?? 3;
    const fontSizes: Record<number, { mobile: string; desktop: string }> = {
      1: { mobile: "11px", desktop: "13px" },
      2: { mobile: "12px", desktop: "14px" },
      3: { mobile: "13px", desktop: "15px" },
      4: { mobile: "14px", desktop: "16px" },
      5: { mobile: "15px", desktop: "18px" },
    };
    const sizes = fontSizes[fontSize] || fontSizes[3];
    document.documentElement.style.setProperty("--user-font-size-mobile", sizes.mobile);
    document.documentElement.style.setProperty("--user-font-size-desktop", sizes.desktop);
    document.documentElement.style.fontSize = ""; // clear inline override to let CSS media queries apply

    // 5. Reduce Motion class toggling
    const reduceMotion = user.accessibilityPrefs?.reduceMotion ?? false;
    if (reduceMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [user]);

  // Request notification permission when user is loaded
  useEffect(() => {
    if (user && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(console.error);
      }
    }
  }, [user]);

  // Scroll main content to top whenever page changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    // Also scroll window to top
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentPage]);

  useEffect(() => {
    const handleViewUser = (e: any) => {
      if (e.detail === user?._id) {
        setCurrentPage("profile");
      } else {
        setViewUserId(e.detail);
        setCurrentPage("userProfile");
      }
    };
    const handleNavigate = (e: any) => {
      setCurrentPage(e.detail);
    };
    window.addEventListener("twiller-view-user", handleViewUser);
    window.addEventListener("twiller-navigate", handleNavigate);
    return () => {
      window.removeEventListener("twiller-view-user", handleViewUser);
      window.removeEventListener("twiller-navigate", handleNavigate);
    };
  }, [user?._id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white mx-auto">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  const isFullWidth = FULL_WIDTH_PAGES.includes(currentPage as string);
  const showRightSidebar = !NO_RIGHT_SIDEBAR.includes(currentPage as string);

  return (
    <div className="w-screen min-h-screen min-h-dvh bg-black text-white flex flex-col md:flex-row justify-center overflow-x-hidden relative pb-16 md:pb-0">
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:block flex-shrink-0 w-[68px] xl:w-[275px]">
        <Sidebar currentPage={currentPage as Page} onNavigate={setCurrentPage} />
      </div>

      {/* ── Mobile Sticky Top Header ─────────────────────────────── */}
      <header className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-[#2f3336] z-40 h-16 flex items-center justify-between px-4 md:hidden flex-shrink-0 w-full">
        <button onClick={() => setIsDrawerOpen(true)} className="flex-shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={mediaUrl(user.avatar)} alt={user.displayName} />
            <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-base">
              {user.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <span className="font-extrabold text-[20px] text-[#e7e9ea] tracking-tight">
          {t(currentPage === "userProfile" ? "profile" : currentPage.toLowerCase())}
        </span>
        <button onClick={() => setCurrentPage("settings")} className="text-[#e7e9ea] hover:text-white transition-colors">
          <Settings className="h-6 w-6" />
        </button>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className={`flex-1 min-h-screen md:h-screen border-x border-[#2f3336] overflow-x-hidden overflow-y-visible md:overflow-y-auto ${
          isFullWidth ? "max-w-[900px]" : "max-w-[600px]"
        }`}
      >
        <div key={currentPage + (currentPage === "userProfile" ? `-${viewUserId}` : "")} className="animate-page-fade">
          <PageContent page={currentPage} viewUserId={viewUserId} onNavigate={(p: Page) => setCurrentPage(p)} />
        </div>
      </main>

      {/* ── Right Sidebar (lg+ only, not on full-width pages) ────── */}
      {showRightSidebar && (
        <div className="hidden lg:block flex-shrink-0 w-[290px] xl:w-[350px] px-5 pt-2">
          <RightSidebar />
        </div>
      )}

      {/* ── Mobile Floating Action Compose Button ─────────────────── */}
      {currentPage === "home" && (
        <button
          onClick={() => {
            const ta = document.querySelector("textarea[placeholder='What is happening?!']") as HTMLTextAreaElement;
            if (ta) {
              ta.focus();
              ta.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="md:hidden fixed bottom-20 right-4 z-50 bg-[#1d9bf0] hover:bg-[#1a8cd8] active:bg-[#1570b8] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-[#1d9bf0]/40 transition-transform active:scale-95 cursor-pointer"
          aria-label="Compose post"
        >
          <Feather className="h-6 w-6" />
        </button>
      )}

      {/* ── Mobile Sticky Bottom Navigation Bar ──────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-[#2f3336] z-40 h-16 flex items-center justify-around md:hidden pb-safe">
        <button 
          onClick={() => { setCurrentPage("home"); window.scrollTo({ top: 0, behavior: "instant" }); }}
          className={`flex flex-col items-center justify-center p-2 text-white transition-opacity ${currentPage === "home" ? "opacity-100" : "opacity-50"}`}
          aria-label="Home"
        >
          <Home className="h-6 w-6" strokeWidth={currentPage === "home" ? 2.5 : 1.75} />
        </button>
        <button 
          onClick={() => { setCurrentPage("explore"); window.scrollTo({ top: 0, behavior: "instant" }); }}
          className={`flex flex-col items-center justify-center p-2 text-white transition-opacity ${currentPage === "explore" ? "opacity-100" : "opacity-50"}`}
          aria-label="Explore"
        >
          <Search className="h-6 w-6" strokeWidth={currentPage === "explore" ? 2.5 : 1.75} />
        </button>
        <button 
          onClick={() => { setCurrentPage("notifications"); window.scrollTo({ top: 0, behavior: "instant" }); }}
          className={`flex flex-col items-center justify-center p-2 text-white relative transition-opacity ${currentPage === "notifications" ? "opacity-100" : "opacity-50"}`}
          aria-label="Notifications"
        >
          <Bell className="h-6 w-6" strokeWidth={currentPage === "notifications" ? 2.5 : 1.75} />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1.5 min-w-[16px] h-[16px] bg-[#1d9bf0] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm shadow-[#1d9bf0]/20">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => { setCurrentPage("messages"); window.scrollTo({ top: 0, behavior: "instant" }); }}
          className={`flex flex-col items-center justify-center p-2 text-white transition-opacity ${currentPage === "messages" ? "opacity-100" : "opacity-50"}`}
          aria-label="Messages"
        >
          <Mail className="h-6 w-6" strokeWidth={currentPage === "messages" ? 2.5 : 1.75} />
        </button>
        <button 
          onClick={() => { setCurrentPage("profile"); window.scrollTo({ top: 0, behavior: "instant" }); }}
          className={`flex flex-col items-center justify-center p-2 text-white transition-opacity ${currentPage === "profile" ? "opacity-100" : "opacity-50"}`}
          aria-label="Profile"
        >
          <User className="h-6 w-6" strokeWidth={currentPage === "profile" ? 2.5 : 1.75} />
        </button>
      </nav>

      {/* Global notification toast */}
      <NotificationToast />

      {/* Tweet limit modal */}
      <TweetLimitModal onNavigatePremium={() => setCurrentPage("premium")} />

      {/* ── Mobile Navigation Drawer ───────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative flex flex-col w-[280px] landscape:w-[480px] max-w-[80vw] landscape:max-w-[95vw] h-full bg-black border-r border-[#2f3336] shadow-2xl p-4 overflow-y-auto animate-drawer-slide-in text-white">
            {/* Header: Close button and user details */}
            <div className="flex items-center justify-between mb-4 landscape:mb-2">
              <span className="font-bold text-lg">{t("account_info")}</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="mb-6 landscape:mb-3 pb-4 landscape:pb-2 border-b border-[#2f3336]">
              <button
                onClick={() => {
                  setCurrentPage("profile");
                  setIsDrawerOpen(false);
                }}
                className="flex flex-col landscape:flex-row landscape:items-center landscape:gap-3 text-left w-full group"
              >
                <Avatar className="h-12 w-12 landscape:h-10 landscape:w-10 mb-3 landscape:mb-0">
                  <AvatarImage src={mediaUrl(user.avatar)} alt={user.displayName} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-lg">
                    {user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-extrabold text-[17px] landscape:text-[15px] text-[#e7e9ea] hover:underline leading-tight truncate block max-w-full">
                    {user.displayName}
                  </span>
                  <span className="text-[#71767b] text-sm landscape:text-xs truncate block max-w-full">
                    @{user.username}
                  </span>
                </div>
              </button>

              <div className="flex gap-4 mt-3 landscape:mt-2 text-sm landscape:text-xs">
                <span className="text-[#71767b]">
                  <strong className="text-white font-bold">{user.following?.length || 0}</strong> {t("following")}
                </span>
                <span className="text-[#71767b]">
                  <strong className="text-white font-bold">{user.followers?.length || 0}</strong> {t("followers")}
                </span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-x-4 landscape:gap-y-1">
              {[
                { name: "home", icon: Home, label: t("home") },
                { name: "explore", icon: Search, label: t("explore") },
                { name: "notifications", icon: Bell, label: t("notifications"), count: notifCount },
                { name: "messages", icon: Mail, label: t("messages") },
                { name: "bookmarks", icon: Bookmark, label: t("bookmarks") },
                { name: "lists", icon: List, label: t("lists") },
                { name: "premium", icon: Star, label: t("premium") },
                { name: "profile", icon: User, label: t("profile") },
              ].map((item) => {
                const isActive = currentPage === item.name;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setCurrentPage(item.name as any);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-3 py-3 landscape:py-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-left ${
                      isActive ? "font-extrabold text-white" : "font-normal text-[#e7e9ea]"
                    }`}
                  >
                    <div className="relative">
                      <Icon className="h-6 w-6 landscape:h-5 landscape:w-5" strokeWidth={isActive ? 2.5 : 1.75} />
                      {item.count ? item.count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-[#1d9bf0] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                          {item.count > 9 ? "9+" : item.count}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[17px] landscape:text-[15px]">{item.label}</span>
                  </button>
                );
              })}

              <div className="border-t border-[#2f3336] my-2 pt-2 landscape:col-span-2 landscape:my-1 landscape:pt-1" />

              {/* Settings & Privacy */}
              <button
                onClick={() => {
                  setCurrentPage("settings");
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-3 py-3 landscape:py-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-left ${
                  currentPage === "settings" ? "font-extrabold text-white" : "font-normal text-[#e7e9ea]"
                }`}
              >
                <Settings className="h-6 w-6 landscape:h-5 landscape:w-5" strokeWidth={currentPage === "settings" ? 2.5 : 1.75} />
                <span className="text-[17px] landscape:text-[15px]">{t("settings")}</span>
              </button>

              {/* Language selection */}
              <button
                onClick={() => {
                  setShowLanguageModal(true);
                  setIsDrawerOpen(false);
                }}
                className="w-full flex items-center gap-4 px-3 py-3 landscape:py-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-[#e7e9ea] text-left"
              >
                <Globe className="h-6 w-6 landscape:h-5 landscape:w-5" strokeWidth={1.75} />
                <span className="text-[17px] landscape:text-[15px]">{t("change_language")}</span>
              </button>

              {/* Help Center */}
              <button
                onClick={() => {
                  setCurrentPage("helpdesk");
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-3 py-3 landscape:py-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-left ${
                  currentPage === "helpdesk" ? "font-extrabold text-white" : "font-normal text-[#e7e9ea]"
                }`}
              >
                <HelpCircle className="h-6 w-6 landscape:h-5 landscape:w-5" strokeWidth={currentPage === "helpdesk" ? 2.5 : 1.75} />
                <span className="text-[17px] landscape:text-[15px]">{t("Help Desk")}</span>
              </button>

              <div className="border-t border-[#2f3336] my-2 pt-2 landscape:col-span-2 landscape:my-1 landscape:pt-1" />

              {/* Logout */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 landscape:py-2 rounded-full hover:bg-red-500/10 active:scale-95 transition-all text-red-500 text-left font-bold landscape:col-span-2"
              >
                <LogOut className="h-6 w-6 landscape:h-5 landscape:w-5" strokeWidth={2} />
                <span className="text-[17px] landscape:text-[15px]">{t("logout")}</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Language selector modal */}
      {showLanguageModal && (
        <LanguageSelectorModal onClose={() => setShowLanguageModal(false)} />
      )}
    </div>
  );
};

export default Mainlayout;
