"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import LoadingSpinner from "./loading-spinner";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import {
  processTweetsForNotifications,
  syncNotificationPreference,
  setUserInterests,
} from "@/lib/notificationService";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowUp } from "lucide-react";
import type { Tweet } from "@/lib/types";

const Feed = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [allTweets, setAllTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("foryou");
  const [newPosts, setNewPosts] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Track tweet IDs already seen so we only popup for truly brand-new ones
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Keep the notification service in sync with the user's latest interests
  useEffect(() => {
    setUserInterests(user?.interests || []);
  }, [user?.interests]);

  // Keep the notification enabled/disabled preference in sync
  useEffect(() => {
    syncNotificationPreference(user?.notificationsEnabled);
  }, [user?.notificationsEnabled]);

  const fetchTweets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axiosInstance.get("/post");
      const fetched: Tweet[] = res.data || [];

      if (!initialLoadDone.current) {
        // ── Initial load ─────────────────────────────────────────────────────
        // Just render the feed. Do NOT fire browser popups for old/seeded tweets
        // (they will appear in the Notifications page via the backend live-scan).
        initialLoadDone.current = true;
        fetched.forEach(t => seenIdsRef.current.add(t._id));
        setAllTweets(fetched);
      } else {
        // ── Polling ──────────────────────────────────────────────────────────
        // Find genuinely new tweets (not seen before) and fire popups for those.
        const newTweets = fetched.filter(t => !seenIdsRef.current.has(t._id));
        if (newTweets.length > 0) {
          setNewPosts(prev => prev + newTweets.length);
          processTweetsForNotifications(newTweets); // fires popup only for new ones
          newTweets.forEach(t => seenIdsRef.current.add(t._id));
        }
        setAllTweets(fetched);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTweets();
    // Poll for new tweets every 60 seconds
    pollingRef.current = setInterval(() => fetchTweets(true), 60000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchTweets]);

  const handleNewTweet = (tweet: Tweet) => {
    seenIdsRef.current.add(tweet._id); // own post — mark seen so no self-popup in Feed
    if (tweet.scheduledAt && new Date(tweet.scheduledAt) > new Date()) {
      // Future scheduled tweet — do not prepend to feed
      return;
    }
    setAllTweets(prev => [tweet, ...prev]);

    // If the user's own tweet matches their interests or keywords, fire the popup
    // (the backend will store the notification; here we just do the in-app toast)
    processTweetsForNotifications([tweet]);
  };

  const handleDeleted = (id: string) => {
    setAllTweets(prev => prev.filter(t => t._id !== id));
  };

  const showNewPosts = () => {
    setNewPosts(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter for Following tab
  const displayedTweets = activeTab === "following"
    ? allTweets.filter(t => user?.following?.includes(t.author?._id as string))
    : allTweets;

  return (
    <div className="min-h-screen relative">
      {/* Sticky header */}
      <div className="sticky top-14 md:top-0 bg-black/80 backdrop-blur-md border-b border-[#2f3336] z-10">
        <div className="px-4 pt-3 pb-0 hidden md:block">
          <h1 className="text-xl font-extrabold text-[#e7e9ea]">{t("home")}</h1>
        </div>
        <div className="flex">
          {[
            { id: "foryou", label: t("for_you") || "For you" },
            { id: "following", label: t("following") },
          ].map((tab) => (
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

      {/* New posts banner */}
      {newPosts > 0 && (
        <button
          onClick={showNewPosts}
          className="w-full py-3 text-[#1d9bf0] text-[15px] font-semibold hover:bg-white/5 transition-colors flex items-center justify-center space-x-2 border-b border-[#2f3336]"
        >
          <ArrowUp className="h-4 w-4" />
          <span>{t("show_posts")} ({newPosts})</span>
        </button>
      )}

      <TweetComposer onTweetPosted={handleNewTweet} />

      <div className="divide-y divide-[#2f3336]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-[#71767b] text-sm">{t("loading_posts") || "Loading posts…"}</p>
          </div>
        ) : displayedTweets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#1d9bf0]">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <h3 className="text-[#e7e9ea] font-extrabold text-xl mb-1">
              {activeTab === "following" ? (t("not_following_anyone") || "You're not following anyone yet") : (t("welcome_to_x") || "Welcome to X!")}
            </h3>
            <p className="text-[#71767b] text-[15px] max-w-sm">
              {activeTab === "following"
                ? (t("when_you_follow") || "When you follow people, their posts will show up here.")
                : (t("be_the_first") || "Be the first to post something.")}
            </p>
          </div>
        ) : activeTab === "foryou" ? (
          [...displayedTweets]
            .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
            .map((tweet) => (
              <TweetCard key={tweet._id} tweet={tweet} onDeleted={handleDeleted} />
            ))
        ) : (
          displayedTweets.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
