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
import { Home, Search, Bell, Mail, User, Feather, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import { useLanguage } from "@/context/LanguageContext";

const ExplorePage       = dynamic(() => import("../pages/ExplorePage"),       { ssr: false });
const NotificationsPage = dynamic(() => import("../pages/NotificationsPage"), { ssr: false });
const MessagesPage      = dynamic(() => import("../pages/MessagesPage"),      { ssr: false });
const BookmarksPage     = dynamic(() => import("../pages/BookmarksPage"),     { ssr: false });
const ListsPage         = dynamic(() => import("../pages/ListsPage"),         { ssr: false });
const PremiumPage       = dynamic(() => import("../pages/PremiumPage"),       { ssr: false });
const SettingsPage      = dynamic(() => import("../pages/SettingsPage"),      { ssr: false });
const HelpDeskPage      = dynamic(() => import("../pages/HelpDeskPage"),      { ssr: false });

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
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page | "userProfile">("home");
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
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
    const fontSizes: Record<number, string> = {
      1: "13px",
      2: "14px",
      3: "15px",
      4: "16px",
      5: "18px",
    };
    document.documentElement.style.fontSize = fontSizes[fontSize] || "15px";

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
      <header className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-[#2f3336] z-40 h-14 flex items-center justify-between px-4 md:hidden flex-shrink-0 w-full">
        <button onClick={() => setCurrentPage("profile")} className="flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={mediaUrl(user.avatar)} alt={user.displayName} />
            <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-xs">
              {user.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <span className="font-extrabold text-[17px] text-[#e7e9ea] tracking-tight">
          {t(currentPage === "userProfile" ? "profile" : currentPage.toLowerCase())}
        </span>
        <button onClick={() => setCurrentPage("settings")} className="text-[#e7e9ea] hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className={`flex-1 min-h-screen border-x border-[#2f3336] overflow-x-hidden overflow-y-auto ${
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
    </div>
  );
};

export default Mainlayout;
