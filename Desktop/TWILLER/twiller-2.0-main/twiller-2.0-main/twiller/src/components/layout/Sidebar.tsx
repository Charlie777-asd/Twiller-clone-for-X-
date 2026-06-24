"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Home, Search, Bell, Mail, Bookmark, User, MoreHorizontal,
  LogOut, Feather, Settings, HelpCircle, List, Star, Globe
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelectorModal from "../LanguageSelectorModal";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";

export type Page = "home" | "explore" | "notifications" | "messages" | "bookmarks" | "profile" | "lists" | "premium" | "settings" | "helpdesk";

interface SidebarProps {
  currentPage?: Page;
  onNavigate?: (page: Page) => void;
}

const navItems = [
  { name: "Home",          icon: Home,     page: "home"          as Page },
  { name: "Explore",       icon: Search,   page: "explore"       as Page },
  { name: "Notifications", icon: Bell,     page: "notifications" as Page, showBadge: true },
  { name: "Messages",      icon: Mail,     page: "messages"      as Page },
  { name: "Bookmarks",     icon: Bookmark, page: "bookmarks"     as Page },
  { name: "Lists",         icon: List,     page: "lists"         as Page },
  { name: "Premium",       icon: Star,     page: "premium"       as Page },
  { name: "Profile",       icon: User,     page: "profile"       as Page },
];

export default function Sidebar({ currentPage = "home", onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [notifCount, setNotifCount] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const processedNotifIdsRef = useRef<Set<string>>(new Set());

  const fetchUnreadCount = useCallback(async (isFirstLoad = false) => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/notifications/${user._id}`);
      const list = res.data || [];
      const unread = list.filter((n: { isRead: boolean }) => !n.isRead).length;
      setNotifCount(unread);

      const processed = processedNotifIdsRef.current;
      if (isFirstLoad || processed.size === 0) {
        list.forEach((n: { _id: string }) => processed.add(n._id));
      } else {
        list.forEach((n: any) => {
          if (!n.isRead && !processed.has(n._id)) {
            processed.add(n._id);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("twiller-notification-received", { detail: { notification: n } })
              );
            }
          }
        });
      }
    } catch { /* ignore */ }
  }, [user?._id]);

  useEffect(() => {
    if (currentPage === "notifications") return;
    fetchUnreadCount(true);
    const interval = setInterval(() => fetchUnreadCount(false), 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, currentPage]);

  // Clear badge immediately when user visits notifications page
  useEffect(() => {
    if (currentPage === "notifications") {
      setNotifCount(0);
    }
  }, [currentPage]);

  const goTo = (page: Page) => {
    onNavigate?.(page);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className="flex flex-col h-screen sticky top-0 bg-black z-50">
      {/* X Logo */}
      <div className="p-3 mb-1">
        <button
          onClick={() => goTo("home")}
          className="p-3 rounded-full hover:bg-white/10 transition-colors inline-flex items-center justify-center"
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const badgeCount = item.showBadge && notifCount > 0 ? notifCount : 0;

          return (
            <button
              key={item.name}
              onClick={() => goTo(item.page)}
              className={`group w-full flex items-center space-x-4 px-3 py-3 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-[0.98] ${
                isActive ? "font-extrabold" : "font-normal"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative flex-shrink-0 transition-transform group-hover:scale-105 duration-150">
                <item.icon
                  className="h-[26px] w-[26px] text-[#e7e9ea] transition-all"
                  strokeWidth={isActive ? 2.5 : 1.75}
                  fill={
                    isActive && ["home", "notifications", "messages", "bookmarks", "settings"].includes(item.page)
                      ? "currentColor"
                      : "none"
                  }
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#1d9bf0] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-md shadow-[#1d9bf0]/20 animate-scale-up">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[#e7e9ea] group-hover:text-white transition-colors text-xl hidden xl:block leading-none ${isActive ? "font-extrabold" : "font-normal"}`}>
                {t(item.name.toLowerCase())}
              </span>
            </button>
          );
        })}

        {/* More dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group w-full flex items-center space-x-4 px-3 py-3 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-[0.98]" aria-label="More menu">
              <MoreHorizontal className="h-[26px] w-[26px] text-[#e7e9ea] group-hover:scale-105 transition-transform duration-150" strokeWidth={1.75} />
              <span className="text-[#e7e9ea] group-hover:text-white transition-colors text-xl hidden xl:block font-normal">{t("More")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-black/90 backdrop-blur-xl border border-[#2f3336] shadow-2xl rounded-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100" align="start" side="right">
            <DropdownMenuItem
              className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
              onClick={() => goTo("settings")}
            >
              <Settings className="mr-3 h-5 w-5 text-[#71767b]" />
              <span className="font-bold text-sm">{t("settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
              onClick={() => setShowLanguageModal(true)}
            >
              <Globe className="mr-3 h-5 w-5 text-[#71767b]" />
              <span className="font-bold text-sm">{t("change_language")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150"
              onClick={() => goTo("helpdesk" as Page)}
            >
              <HelpCircle className="mr-3 h-5 w-5 text-[#71767b]" />
              <span className="font-bold text-sm">{t("Help Desk")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Post button */}
        <div className="mt-3 px-1">
          <button
            onClick={() => {
              goTo("home");
              setTimeout(() => {
                const ta = document.querySelector("textarea[placeholder='What is happening?!']") as HTMLTextAreaElement;
                ta?.focus();
              }, 100);
            }}
            className="hidden xl:flex w-full items-center justify-center bg-[#1d9bf0] hover:bg-[#1a8cd8] active:bg-[#1570b8] text-white font-bold text-[17px] py-3.5 rounded-full transition-colors shadow-lg shadow-[#1d9bf0]/20"
          >
            {t("post")}
          </button>
          <button
            onClick={() => goTo("home")}
            className="xl:hidden mx-auto flex items-center justify-center bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white w-12 h-12 rounded-full transition-colors"
            aria-label="Compose post"
          >
            <Feather className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* User account pill */}
      {user && (
        <div className="p-3 mb-1 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center space-x-3 p-3 rounded-full hover:bg-white/10 transition-colors">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={mediaUrl(user.avatar)} alt={user.displayName} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                    {user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0 hidden xl:block">
                  <div className="text-[#e7e9ea] font-bold text-[15px] leading-tight truncate">{user.displayName}</div>
                  <div className="text-[#71767b] text-[15px] truncate">@{user.username}</div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-[#e7e9ea] hidden xl:block flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 bg-black/90 backdrop-blur-xl border border-[#2f3336] shadow-2xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150" align="start" side="top" sideOffset={8}>
              <div className="px-4 py-3 flex items-center space-x-3 border-b border-[#2f3336]/60 mb-1.5">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={mediaUrl(user.avatar)} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">{user.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[#e7e9ea] font-extrabold text-sm truncate">{user.displayName}</p>
                  <p className="text-[#71767b] text-sm truncate">@{user.username}</p>
                </div>
              </div>
              <DropdownMenuItem className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 font-bold" onClick={() => goTo("profile")}>
                <User className="mr-3 h-5 w-5 text-[#71767b]" />
                {t("View Profile")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150" onClick={() => goTo("settings")}>
                <Settings className="mr-3 h-5 w-5 text-[#71767b]" />
                {t("Settings and privacy")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2f3336] my-1" />
              <DropdownMenuItem className="text-[#e7e9ea] hover:bg-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 font-bold" onClick={logout}>
                <LogOut className="mr-3 h-5 w-5 text-[#f4212e]" />
                <span>{t("logout")} <span className="text-[#71767b] font-normal">@{user.username}</span></span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {showLanguageModal && (
        <LanguageSelectorModal onClose={() => setShowLanguageModal(false)} />
      )}
    </div>
  );
}
