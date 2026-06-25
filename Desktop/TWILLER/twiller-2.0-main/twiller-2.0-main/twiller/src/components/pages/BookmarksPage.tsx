"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bookmark, Trash2, MoreHorizontal } from "lucide-react";
import TweetCard from "../TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import { encodeEmailPath } from "@/lib/backendUrl";
import { useAuth } from "@/context/AuthContext";
import type { Tweet } from "@/lib/types";
import LoadingSpinner from "../loading-spinner";
import { useLanguage } from "@/context/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get(`/user/${encodeEmailPath(user.email)}/bookmarks`);
      setBookmarks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bookmarks", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  useEffect(() => {
    const handler = () => fetchBookmarks();
    window.addEventListener("twiller-bookmarks-changed", handler);
    return () => window.removeEventListener("twiller-bookmarks-changed", handler);
  }, [fetchBookmarks]);

  const clearAll = async () => {
    if (!user?.email) return;
    setClearing(true);
    setShowConfirm(false);
    try {
      await Promise.all(
        bookmarks.map(tweet =>
          axiosInstance.post(`/user/bookmark/${tweet._id}`, { email: user.email })
        )
      );
      setBookmarks([]);
    } catch (err) {
      console.error("Failed to clear bookmarks", err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 md:top-0 bg-black/80 backdrop-blur-md border-b border-[#2f3336] z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="hidden md:block text-xl font-extrabold text-[#e7e9ea]">{t("Bookmarks")}</h1>
            <p className="hidden md:block text-[#71767b] text-sm">@{user?.username}</p>
          </div>
          {bookmarks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border border-[#2f3336] shadow-2xl rounded-2xl p-1" align="end">
                <DropdownMenuItem
                  className="text-[#f4212e] hover:bg-[#f4212e]/10 rounded-xl px-4 py-3 cursor-pointer font-bold"
                  onClick={() => setShowConfirm(true)}
                >
                  <Trash2 className="mr-3 h-5 w-5" />
                  {t("Clear all bookmarks")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Clear confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#5b7083]/40">
          <div className="bg-black border border-[#2f3336] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-[#e7e9ea] font-extrabold text-2xl mb-2">{t("Clear all Bookmarks?")}</h2>
            <p className="text-[#71767b] text-[15px] mb-6">{t("This can't be undone and you'll remove all posts you've added to your Bookmarks.")}</p>
            <div className="space-y-3">
              <button
                onClick={clearAll}
                className="w-full bg-[#f4212e] hover:bg-[#cc1b28] text-white font-extrabold py-3 rounded-full text-[17px] transition-colors"
              >
                {t("Clear")}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full border border-[#536471] text-[#e7e9ea] hover:bg-white/5 font-bold py-3 rounded-full text-[17px] transition-colors"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading || clearing ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-5">
            <Bookmark className="h-10 w-10 text-[#1d9bf0]" />
          </div>
          <h3 className="text-[#e7e9ea] font-extrabold text-[23px] mb-2">{t("Save posts for later")}</h3>
          <p className="text-[#71767b] text-[15px] max-w-[300px]">
            {t("Don't let the good ones fly away! Bookmark posts to easily find them again in the future.")}
          </p>
        </div>
      ) : (
        <div>
          <div className="px-4 py-2 text-[#71767b] text-sm border-b border-[#2f3336]">
            {bookmarks.length} {t("saved")} {bookmarks.length === 1 ? t("post") : t("posts")} {t("— visible only to you")}
          </div>
          <div className="divide-y divide-[#2f3336]">
            {bookmarks.map((tweet) => (
              <TweetCard key={tweet._id} tweet={tweet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
