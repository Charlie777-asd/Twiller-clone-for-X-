"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Heart, Repeat2, UserPlus, AtSign, Settings, Star, Mail, PenSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import LoadingSpinner from "../loading-spinner";
import { useLanguage } from "@/context/LanguageContext";

type NotifTab = "all" | "verified" | "mentions";

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0] flex-shrink-0 inline-block ml-0.5">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  like:     { icon: <Heart className="h-5 w-5 fill-[#f91880] text-[#f91880]" />,   color: "bg-[#f91880]/10" },
  follow:   { icon: <UserPlus className="h-5 w-5 text-[#1d9bf0]" />,               color: "bg-[#1d9bf0]/10" },
  retweet:  { icon: <Repeat2 className="h-5 w-5 text-[#00ba7c]" />,                color: "bg-[#00ba7c]/10" },
  mention:  { icon: <AtSign className="h-5 w-5 text-[#1d9bf0]" />,                 color: "bg-[#1d9bf0]/10" },
  interest: { icon: <Star className="h-5 w-5 fill-[#ffd400] text-[#ffd400]" />,    color: "bg-[#ffd400]/10" },
  post:     { icon: <PenSquare className="h-5 w-5 text-[#1d9bf0]" />,              color: "bg-[#1d9bf0]/10" },
  message:  { icon: <Mail className="h-5 w-5 text-[#1d9bf0]" />,                   color: "bg-[#1d9bf0]/10" },
};

const formatTime = (ts?: string) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const groupByDay = (notifs: any[], t: any) => {
  const groups: { label: string; items: any[] }[] = [];
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  notifs.forEach(n => {
    const d = new Date(n.timestamp).toDateString();
    const label =
      d === today ? t("Today") :
      d === yesterday ? t("Yesterday") :
      new Date(n.timestamp).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const existing = groups.find(g => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  });
  return groups;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<NotifTab>("all");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const res = await axiosInstance.get(`/notifications/${user._id}`);
      const fetched = res.data || [];
      setNotifications(fetched);

      // Cache unread notifications on load to keep them highlighted during this page visit
      setUnseenIds(prev => {
        const copy = new Set(prev);
        fetched.forEach((n: any) => {
          if (!n.isRead) {
            copy.add(n._id);
          }
        });
        return copy;
      });
    } catch { /* ignore */ } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  // Mark all as read in DB, then update local state
  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await axiosInstance.patch(`/notifications/${user._id}/mark-all-read`);
      // Optimistically update local state — all become read
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all read when page first becomes active
  useEffect(() => {
    if (!loading && user) {
      markAllRead();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);


  const tabs: { id: NotifTab; label: string }[] = [
    { id: "all", label: t("All") },
    { id: "verified", label: t("Verified") },
    { id: "mentions", label: t("Mentions") },
  ];

  const filtered =
    activeTab === "all" ? notifications :
    activeTab === "verified" ? notifications.filter(n => n.sender?.verified) :
    notifications.filter(n => n.type === "mention");

  const groups = groupByDay(filtered, t);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-extrabold text-[#e7e9ea]">{t("Notifications")}</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="bg-[#1d9bf0] text-white text-xs font-bold rounded-full px-2.5 py-0.5 animate-pulse">
                {unreadCount} {t("new")}
              </span>
            )}
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea]">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-[15px] font-semibold transition-colors relative hover:bg-white/5 ${
                activeTab === tab.id ? "text-[#e7e9ea]" : "text-[#71767b] hover:text-[#e7e9ea]"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#1d9bf0] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-5">
            <Bell className="h-10 w-10 text-[#1d9bf0]" />
          </div>
          <h3 className="text-[#e7e9ea] font-extrabold text-2xl mb-2">
            {activeTab === "mentions" ? t("Nothing to see here — yet") : t("Nothing new here — yet")}
          </h3>
          <p className="text-[#71767b] text-[15px] max-w-sm leading-relaxed">
            {activeTab === "mentions"
              ? t("When someone mentions you, replies to you or your posts, you'll find it here.")
              : t("Post tweets with your interest hashtags and get notified when others do too!")}
          </p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.label}>
            <div className="px-4 py-2.5 border-b border-[#2f3336] bg-black/30">
              <p className="text-[#71767b] text-sm font-semibold">{group.label}</p>
            </div>
            {group.items.map((notif, idx) => {
              const config = typeConfig[notif.type] || typeConfig.mention;
              return (
                <div
                  key={notif._id || `${notif.type}-${idx}`}
                  onClick={() => {
                    if (notif.type === "message") {
                      window.dispatchEvent(new CustomEvent("twiller-navigate", { detail: "messages" }));
                    } else if (notif.sender && notif.sender._id) {
                      window.dispatchEvent(new CustomEvent("twiller-view-user", { detail: notif.sender._id }));
                    } else {
                      window.dispatchEvent(new CustomEvent("twiller-navigate", { detail: "home" }));
                    }
                  }}
                  className={`flex space-x-3 px-4 py-4 border-b border-[#2f3336] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                    (!notif.isRead || unseenIds.has(notif._id)) ? "bg-[#1d9bf0]/[0.04]" : ""
                  }`}
                >
                  {/* Left: type icon */}
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {config.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Sender avatar + unread dot */}
                    {notif.sender && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={notif.sender.avatar} />
                          <AvatarFallback className="bg-[#1d9bf0] text-white text-xs font-bold">
                            {notif.sender.displayName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {(!notif.isRead || unseenIds.has(notif._id)) && (
                          <span className="w-2 h-2 bg-[#1d9bf0] rounded-full flex-shrink-0" title="Unread" />
                        )}
                      </div>
                    )}

                    {/* Message */}
                    <p className="text-[#e7e9ea] text-[15px] leading-snug">
                      {notif.sender && (
                        <span className="font-bold hover:underline cursor-pointer mr-1">
                          {notif.sender.displayName}
                        </span>
                      )}
                      {notif.sender?.verified && <VerifiedBadge />}
                      <span className="ml-1 text-[#8b98a5]">{notif.content}</span>
                    </p>

                    {/* Tweet excerpt */}
                    {notif.extra && (
                      <p className="text-[#71767b] text-[14px] mt-1.5 pl-3 border-l-2 border-[#2f3336] italic line-clamp-2">
                        {notif.extra}
                      </p>
                    )}

                    <p className="text-[#71767b] text-xs mt-1.5">{formatTime(notif.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
