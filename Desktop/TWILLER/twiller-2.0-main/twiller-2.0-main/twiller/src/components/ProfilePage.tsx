"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Tag,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import TweetCard from "./TweetCard";
import Editprofile from "./Editprofile";
import FollowListModal from "./FollowListModal";
import axiosInstance from "@/lib/axiosInstance";
import { encodeEmailPath, mediaUrl } from "@/lib/backendUrl";
import LoadingSpinner from "./loading-spinner";
import type { Tweet, UserSession, LoginHistoryEntry } from "@/lib/types";
import { isNotificationsEnabled, requestNotificationPermission, setNotificationsEnabled } from "@/lib/notificationService";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Sessions & Login History State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [interestInput, setInterestInput] = useState("");
  const [savingInterest, setSavingInterest] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [mediaTweets, setMediaTweets] = React.useState<Tweet[]>([]);
  const [mediaLoading, setMediaLoading] = React.useState(false);
  const notificationsEnabledFromUser = user?.notificationsEnabled;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => isNotificationsEnabled());

  useEffect(() => {
    if (typeof notificationsEnabledFromUser === "boolean") {
      setNotificationsEnabledState(notificationsEnabledFromUser);
    }
  }, [notificationsEnabledFromUser]);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        setNotificationsEnabledState(true);
        showToast("Browser notifications enabled! ✅");
        if (user?.email) {
          try {
            const res = await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, { notificationsEnabled: true });
            updateUser(res.data);
          } catch (err) {
            console.error(err);
          }
        }
      } else {
        showToast("Permission denied — please enable notifications in browser settings.");
      }
    } else {
      setNotificationsEnabled(false);
      setNotificationsEnabledState(false);
      showToast("Browser notifications disabled.");
      if (user?.email) {
        try {
          const res = await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, { notificationsEnabled: false });
          updateUser(res.data);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Initialize interests from user
  useEffect(() => {
    if (user?.interests) {
      setInterests(user.interests);
    }
  }, [user?.interests]);

  React.useEffect(() => {
    if (activeTab === "media" && user?._id && mediaTweets.length === 0) {
      setMediaLoading(true);
      axiosInstance.get(`/post/user/${user._id}/media`)
        .then(res => setMediaTweets(res.data || []))
        .catch(() => {})
        .finally(() => setMediaLoading(false));
    }
  }, [activeTab, user?._id, mediaTweets.length]);

  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestInput.trim() || !user) return;
    setSavingInterest(true);
    try {
      const cleanInput = interestInput.trim().replace(/^#/, "");
      const formatted = `#${cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1).toLowerCase()}`;
      if (interests.map(i => i.toLowerCase()).includes(formatted.toLowerCase())) {
        setInterestInput("");
        showToast("Interest already added!");
        return;
      }
      const newInterests = [...interests, formatted];
      const res = await axiosInstance.patch(`/user/${encodeEmailPath(user.email)}/interests`, { interests: newInterests });
      setInterests(newInterests);
      updateUser(res.data);
      setInterestInput("");
      showToast(`✅ Added ${formatted} to your interests!`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to add interest. Please try again.");
    } finally {
      setSavingInterest(false);
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!user) return;
    try {
      const newInterests = interests.filter(i => i !== interest);
      const res = await axiosInstance.patch(`/user/${encodeEmailPath(user.email)}/interests`, { interests: newInterests });
      setInterests(newInterests);
      updateUser(res.data);
      showToast(`🗑️ Removed ${interest} from your interests`);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Tweet fetching ────────────────────────────────────────────────────────
  const fetchTweets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/post/user/${user._id}`);
      setTweets(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  // ── Session & Login History Handlers ─────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!user?._id) return;
    try {
      setSessionsLoading(true);
      const res = await axiosInstance.get(`/users/${user._id}/sessions`);
      const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
      const sorted = (res.data || []).sort((a: UserSession, b: UserSession) => {
        if (a.sessionId === currentSessionId) return -1;
        if (b.sessionId === currentSessionId) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setSessions(sorted);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (activeTab === "sessions" && user?._id) {
      fetchSessions();
    }
  }, [activeTab, user?._id, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!user?._id) return;
    const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
    try {
      const res = await axiosInstance.delete(`/users/${user._id}/sessions/${sessionId}`);
      const sorted = (res.data || []).sort((a: UserSession, b: UserSession) => {
        if (a.sessionId === currentSessionId) return -1;
        if (b.sessionId === currentSessionId) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setSessions(sorted);
      showToast(t("session_revoked") || "Session revoked successfully! 🔐");
      if (sessionId === currentSessionId) {
        localStorage.removeItem("twitter-user");
        localStorage.removeItem("twitter-session-id");
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
      showToast(t("revoke_failed") || "Failed to revoke session.");
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!user?._id) return;
    const currentSessionId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
    if (!currentSessionId) return;
    try {
      const res = await axiosInstance.delete(`/users/${user._id}/sessions/${currentSessionId}/other`);
      const sorted = (res.data || []).sort((a: UserSession, b: UserSession) => {
        if (a.sessionId === currentSessionId) return -1;
        if (b.sessionId === currentSessionId) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setSessions(sorted);
      showToast(t("other_sessions_revoked") || "All other sessions revoked! 🔐");
    } catch (err) {
      console.error(err);
      showToast(t("revoke_other_failed") || "Failed to revoke other sessions.");
    }
  };

  // All hooks must run before early return
  if (!user) return null;

  const userTweets = tweets;


  // ── Tab config ────────────────────────────────────────────────────────────
  const profileTabs = [
    { value: "posts", label: t("posts") || "Posts" },
    { value: "replies", label: t("replies") || "Replies" },
    { value: "media", label: t("media") || "Media" },
    { value: "highlights", label: t("highlights_tab") || "Highlights" },
    { value: "articles", label: t("articles_tab") || "Articles" },
    { value: "sessions", label: t("sessions_tab") || "Sessions" },
  ];

  const emptyMessages: Record<string, { title: string; sub: string }> = {
    replies: { title: t("no_replies_yet") || "No replies yet", sub: t("no_replies_yet_sub") || "When you reply to a post, it will show up here." },
    highlights: { title: t("highlights_empty_title") || "Lights, camera … action!", sub: t("highlights_empty_sub") || "Posts you've highlighted will appear here." },
    articles: { title: t("articles_empty_title") || "No articles yet", sub: t("articles_empty_sub") || "When you write articles, they will show up here." },
    media: { title: t("media_empty_title") || "Lights, camera … attachments!", sub: t("media_empty_sub") || "When you post photos or videos, they'll show up here." },
  };

  return (
    <div className="min-h-screen">
      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-[#2f3336] z-20 px-4 h-[53px] flex items-center space-x-6">
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-6 w-6 text-[#e7e9ea]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#e7e9ea] leading-tight">
            {user.displayName}
          </h1>
          <p className="text-[#71767b] text-sm">{userTweets.length} {t("posts") || "posts"}</p>
        </div>
      </div>

      {/* ── Cover Photo ────────────────────────────────────────────────── */}
      <div className="relative">
        <div 
          className="h-32 sm:h-52 bg-gradient-to-r from-[#1d9bf0] via-[#7856ff] to-[#f91880] relative bg-cover bg-center"
          style={{ backgroundImage: user.coverImage ? `url(${mediaUrl(user.coverImage)})` : undefined }}
        >
          <button 
            onClick={() => setShowEditModal(true)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-black/80 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-10 sm:-bottom-16 left-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 sm:h-32 sm:w-32 border-4 border-black shadow-lg">
              <AvatarImage src={mediaUrl(user.avatar)} alt={user.displayName} />
              <AvatarFallback className="bg-[#1d9bf0] text-white text-2xl sm:text-4xl font-bold">
                {user.displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              onClick={() => setShowEditModal(true)}
            >
              <Camera className="h-6 w-6 text-white animate-scale-up" />
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="flex justify-end p-4 space-x-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="border border-[#536471] text-[#e7e9ea] hover:bg-white/10 font-extrabold rounded-full px-5 py-2 text-sm transition-all duration-200 active:scale-95 shadow-sm shadow-black/20"
          >
            {t("edit_profile") || "Edit profile"}
          </button>
        </div>
      </div>

      {/* ── Profile Info ───────────────────────────────────────────────── */}
      <div className="px-4 mt-10 sm:mt-16 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-[#e7e9ea] text-[22px] font-extrabold leading-tight">
              {user.displayName}
            </h2>
            <p className="text-[#71767b] text-[15px]">@{user.username}</p>
          </div>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#71767b] mt-1">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {user.bio ? (
          <p className="text-[#e7e9ea] text-[15px] leading-relaxed mt-2 mb-3 whitespace-pre-wrap break-words">
            {user.bio}
          </p>
        ) : (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 text-[#71767b] hover:text-[#1d9bf0] text-[15px] mt-2 mb-3 group transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
              <path d="M21.997 2.003a3.01 3.01 0 00-2.12.88l-1.293 1.292 3.243 3.242 1.292-1.292a2.97 2.97 0 00.88-2.109 2.98 2.98 0 00-.88-2.121 2.97 2.97 0 00-1.122-.892zm-3.706 3.465L5.19 18.57l-.65 3.08 3.08-.65L20.533 7.91l-2.242-2.442zM3 17.25L2.003 22l4.75-.997L20.01 7.756l-3.756-3.756L3 17.25z" />
            </svg>
            <span className="group-hover:underline">{t("add_bio") || "Add a bio"}</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#71767b] text-[15px] mb-3">
          {user.location && (
            <span className="flex items-center space-x-1">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{user.location}</span>
            </span>
          )}
          {user.website && (
            <a
              href={`https://${user.website.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#1d9bf0] hover:underline"
            >
              <LinkIcon className="h-4 w-4 flex-shrink-0" />
              <span>{user.website}</span>
            </a>
          )}
          {user.joinedDate && (
            <span className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {t("joined") || "Joined"}{" "}
                {new Date(user.joinedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-5 text-[15px] mb-4">
          <button onClick={() => setFollowModalType("following")} className="hover:underline">
            <span className="text-[#e7e9ea] font-bold">{user.following?.length || 0}</span>
            <span className="text-[#71767b] ml-1">{t("following")}</span>
          </button>
          <button onClick={() => setFollowModalType("followers")} className="hover:underline">
            <span className="text-[#e7e9ea] font-bold">{user.followers?.length || 0}</span>
            <span className="text-[#71767b] ml-1">{t("followers") || "Followers"}</span>
          </button>
        </div>

        {/* Interests Card relocated below following and followers */}
        <div className="mt-4 bg-[#16181c]/40 border border-[#2f3336] rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1 border-b border-[#2f3336] pb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1d9bf0] fill-none stroke-current" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
            <h3 className="text-[#e7e9ea] font-extrabold text-lg">{t("your_interests") || "Your Interests"}</h3>
          </div>
          <p className="text-[#71767b] text-xs leading-relaxed">
            {t("add_topics_desc") || "Add topics you're interested in to get personalized notifications when someone posts about them."}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-1">
            {interests.map((interest) => (
              <span key={interest} className="inline-flex items-center space-x-1 bg-[#1d9bf0]/10 text-[#1d9bf0] px-3 py-1 rounded-full text-xs font-semibold border border-[#1d9bf0]/20 group">
                <span>{interest}</span>
                <button
                  onClick={() => handleRemoveInterest(interest)}
                  className="hover:text-white transition-colors ml-1 opacity-70 hover:opacity-100 font-bold"
                  aria-label={`Remove ${interest}`}
                >×</button>
              </span>
            ))}
            {interests.length === 0 && (
              <span className="text-[#71767b] text-xs italic">{t("no_interests") || "No interests added yet. Add some below!"}</span>
            )}
          </div>

          <form onSubmit={handleAddInterest} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={t("interest_placeholder") || "e.g. Technology, Gaming, Science…"}
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              className="flex-1 bg-[#16181c] border border-[#536471] focus:border-[#1d9bf0] rounded-xl px-4 py-2 text-xs text-[#e7e9ea] placeholder-[#71767b] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={savingInterest || !interestInput.trim()}
              className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-extrabold text-xs px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
            >
              {savingInterest ? (t("adding") || "Adding…") : (t("add") || "Add")}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2f3336]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1d9bf0] fill-none stroke-current" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <div>
                <p className="text-[#e7e9ea] font-extrabold text-sm">{t("browser_keyword_notifications") || "Browser Keyword Notifications"}</p>
                <p className="text-[#71767b] text-[11px] leading-tight mt-0.5">{t("receive_os_popups_desc") || "Receive OS-level popups for \"cricket\", \"science\" or interest topics"}</p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative w-11 h-5.5 rounded-full transition-colors flex items-center ${notificationsEnabled ? "bg-[#1d9bf0]" : "bg-[#536471]"}`}
            >
              <span className={`absolute w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${notificationsEnabled ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Profile Tabs ───────────────────────────────────────────────── */}
      <div className="border-b border-[#2f3336] bg-black sticky top-[53px] z-10">
        <div className="flex overflow-x-auto scrollbar-none w-full scroll-smooth">
          {profileTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 md:flex-initial shrink-0 py-3.5 sm:py-4 px-4 sm:px-6 text-[14px] sm:text-[15px] font-extrabold relative hover:bg-white/5 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.value ? "text-[#e7e9ea]" : "text-[#71767b] hover:text-[#e7e9ea]"
              }`}
            >
              <span className="relative py-1 inline-block">
                {tab.label}
                {activeTab === tab.value && (
                  <span className="absolute bottom-[-13px] sm:bottom-[-16px] left-0 right-0 h-1 bg-[#1d9bf0] rounded-full animate-scale-up" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <LoadingSpinner size="lg" />
              <p className="text-[#71767b] text-sm">{t("loading_posts") || "Loading posts…"}</p>
            </div>
          ) : userTweets.length === 0 ? (
            <EmptyState title={t("empty_posts_title") || "You haven't posted yet"} sub={t("empty_posts_sub") || "When you post, it will show up here."} />
          ) : (
            userTweets.map((tweet) => <TweetCard key={tweet._id} tweet={tweet} />)
          )}
        </div>
      )}

      {activeTab === "media" && (
        <div>
          {mediaLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : mediaTweets.length === 0 ? (
            <EmptyState title={emptyMessages.media.title} sub={emptyMessages.media.sub} />
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {mediaTweets.map(tweet => {
                if (tweet.image || tweet.gifUrl) {
                  return (
                    <div key={tweet._id} className="aspect-square overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(tweet.image || tweet.gifUrl || "")} alt="media" className="w-full h-full object-cover" />
                    </div>
                  );
                }
                if (tweet.audio) {
                  return (
                    <div key={tweet._id} className="aspect-square bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center">
                      <span className="text-3xl">🎵</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}

      {(activeTab === "highlights" || activeTab === "articles") && (
        <EmptyState
          title={emptyMessages[activeTab]?.title ?? "Nothing here yet"}
          sub={emptyMessages[activeTab]?.sub ?? "Content will appear here when available."}
        />
      )}

      {activeTab === "replies" && (
        <EmptyState title={emptyMessages.replies.title} sub={emptyMessages.replies.sub} />
      )}

      {activeTab === "sessions" && (
        <div className="p-4 space-y-6 max-w-full">
          {/* Interests & Notifications relocated to profile header */}

          {/* Active Sessions Card */}
          <div className="bg-[#000000] border border-[#2f3336] rounded-2xl p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2f3336] pb-4">
              <div>
                <h3 className="text-[#e7e9ea] text-lg font-extrabold flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1d9bf0] fill-current"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  {t("active_sessions") || "Active Sessions"}
                </h3>
                <p className="text-[#71767b] text-xs mt-1">
                  {t("sessions_desc") || "Devices currently logged into your Twiller account. You can revoke any session to sign out of that device."}
                </p>
              </div>
              {sessions.filter(s => s.sessionId !== (typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null)).length > 0 && (
                <button
                  onClick={handleRevokeOtherSessions}
                  className="bg-[#f4212e]/10 hover:bg-[#f4212e]/20 border border-[#f4212e]/30 text-[#f4212e] font-extrabold rounded-full px-4 py-2 text-xs transition-colors self-start sm:self-auto shrink-0 min-h-[40px] flex items-center justify-center"
                >
                  {t("revoke_all_others") || "Revoke Other Devices"}
                </button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
            ) : sessions.length === 0 ? (
              <p className="text-[#71767b] text-sm text-center py-4">{t("no_active_sessions") || "No active sessions found."}</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const currentId = typeof window !== "undefined" ? localStorage.getItem("twitter-session-id") : null;
                  const isCurrent = session.sessionId === currentId;
                  return (
                    <div key={session.sessionId} className="bg-[#16181c] border border-[#2f3336] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center shrink-0 mt-0.5">
                          {session.deviceCategory === "mobile" ? (
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1d9bf0] fill-current"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                          ) : session.deviceCategory === "laptop" ? (
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1d9bf0] fill-current"><path d="M22 18V3H2v15H0v2h24v-2h-2zm-8 0h-4v-1h4v1zm6-3H4V5h16v10z"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1d9bf0] fill-current"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v12z"/></svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[#e7e9ea] font-extrabold text-[15px] truncate">{session.browser} on {session.os}</span>
                            {isCurrent && (
                              <span className="bg-[#00ba7c]/15 text-[#00ba7c] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-[#00ba7c]/20">
                                {t("this_device") || "This Device"}
                              </span>
                            )}
                          </div>
                          <p className="text-[#71767b] text-xs mt-1 truncate">IP Address: {session.ipAddress}</p>
                          <p className="text-[#71767b] text-[11px] mt-0.5">
                            Last Active: {new Date(session.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.sessionId)}
                          className="border border-[#f4212e]/50 hover:bg-[#f4212e]/10 text-[#f4212e] font-extrabold rounded-full px-4 py-2 text-xs transition-colors self-start sm:self-auto shrink-0 min-h-[40px] flex items-center justify-center"
                        >
                          {t("revoke") || "Revoke"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Login History Timeline */}
          <div className="bg-[#000000] border border-[#2f3336] rounded-2xl p-4 md:p-6 space-y-4">
            <h3 className="text-[#e7e9ea] text-lg font-extrabold flex items-center gap-2 border-b border-[#2f3336] pb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1d9bf0] fill-current"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.53.85-1.07-3.63-2.16V8h-1.5z"/></svg>
              {t("login_history") || "Recent Login History"}
            </h3>

            {!user.loginHistory || user.loginHistory.length === 0 ? (
              <p className="text-[#71767b] text-sm text-center py-4">{t("no_login_history") || "No recent login attempts recorded."}</p>
            ) : (
              <div className="space-y-4">
                {user.loginHistory.slice().reverse().map((entry: LoginHistoryEntry, idx: number) => (
                  <div key={idx} className="flex gap-3 relative group">
                    {idx < (user.loginHistory || []).length - 1 && (
                      <div className="absolute left-5 top-10 bottom-[-16px] w-[2px] bg-[#2f3336] z-0" />
                    )}
                    <div className="w-10 h-10 rounded-full bg-[#2f3336]/40 flex items-center justify-center shrink-0 z-10">
                      {entry.deviceCategory === "mobile" ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#71767b] fill-current"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                      ) : entry.deviceCategory === "laptop" ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#71767b] fill-current"><path d="M22 18V3H2v15H0v2h24v-2h-2zm-8 0h-4v-1h4v1zm6-3H4V5h16v10z"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#71767b] fill-current"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v12z"/></svg>
                      )}
                    </div>
                    <div className="flex-1 bg-[#16181c]/50 hover:bg-[#16181c] border border-[#2f3336] rounded-xl p-3 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[#e7e9ea] font-extrabold text-[14px]">{entry.browser} on {entry.os}</span>
                        <span className="text-[#71767b] text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#2f3336] rounded-full">
                          {entry.deviceCategory}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[11px] text-[#71767b]">
                        <span>IP: {entry.ipAddress}</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Editprofile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
      {followModalType && (
        <FollowListModal
          userId={user._id}
          type={followModalType}
          onClose={() => setFollowModalType(null)}
        />
      )}

      {/* ── Bottom Toast Notification ─────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[#1d9bf0] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-2xl shadow-[#1d9bf0]/30 whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#1d9bf0]">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <h3 className="text-[#e7e9ea] font-extrabold text-[23px] mb-2">{title}</h3>
      <p className="text-[#71767b] text-[15px]">{sub}</p>
    </div>
  );
}
