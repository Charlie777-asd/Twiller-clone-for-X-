"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Smile, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import type { Tweet } from "@/lib/types";
import LoadingSpinner from "./loading-spinner";
import TranslatedText from "./TranslatedText";

interface ReplyModalProps {
  tweet: Tweet;
  isOpen: boolean;
  onClose: () => void;
  onReplyAdded: () => void;
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0] flex-shrink-0 inline-block">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

const formatDate = (timestamp?: string) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ReplyModal({ tweet, isOpen, onClose, onReplyAdded }: ReplyModalProps) {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const maxLength = 280;

  useEffect(() => {
    if (isOpen && tweet._id) {
      setRepliesLoading(true);
      axiosInstance.get(`/tweet/${tweet._id}/replies`)
        .then(res => setReplies(res.data))
        .catch(() => {})
        .finally(() => setRepliesLoading(false));
    }
    if (!isOpen) { setContent(""); setReplies([]); }
  }, [isOpen, tweet._id]);

  if (!isOpen || !user) return null;

  const handleReply = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      let replyContent = content.trim();
      // Auto-translate reply if non-English language selected
      if (currentLanguage !== "English" && replyContent) {
        try {
          const translateRes = await axiosInstance.post("/translate", {
            text: replyContent,
            targetLang: currentLanguage,
          });
          if (translateRes.data?.translated) {
            replyContent = translateRes.data.translated;
          }
        } catch {
          console.warn("Reply translation failed, using original.");
        }
      }
      const res = await axiosInstance.post(`/tweet/${tweet._id}/reply`, {
        userId: user._id,
        content: replyContent,
      });
      setReplies([res.data, ...replies]);
      setContent("");
      onReplyAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min(content.length / maxLength, 1);
  const circumference = 2 * Math.PI * 14;
  const isNear = content.length > maxLength * 0.8;
  const isOver = content.length > maxLength;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-10 bg-[#5b7083]/40 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-black w-full max-w-[600px] rounded-2xl flex flex-col mb-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-[#2f3336]">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea] mr-6"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-[#e7e9ea] font-bold text-[17px]">
            {tweet.author?.displayName}&apos;s post
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Original tweet */}
          <div className="px-4 py-3">
            <div className="flex space-x-3">
              <div className="flex flex-col items-center">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={tweet.author?.avatar} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                    {tweet.author?.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="w-0.5 bg-[#333639] flex-1 mt-2 min-h-[30px]" />
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center space-x-1 mb-0.5">
                  <span className="font-bold text-[#e7e9ea] text-[15px]">{tweet.author?.displayName}</span>
                  {tweet.author?.verified && <VerifiedBadge />}
                  <span className="text-[#71767b] text-[15px]">@{tweet.author?.username}</span>
                  <span className="text-[#71767b]">·</span>
                  <span className="text-[#71767b] text-[15px]">{formatDate(tweet.timestamp)}</span>
                </div>
                <p 
                  translate="no"
                  className="notranslate text-[#e7e9ea] text-[15px] leading-snug whitespace-pre-wrap"
                >
                  {tweet.content}
                </p>
                {tweet.image && (
                  <img src={mediaUrl(tweet.image)} alt="media" className="mt-2 rounded-xl w-full max-h-60 object-cover border border-[#2f3336]" />
                )}
                <p className="text-[#71767b] text-[15px] mt-3">
                  Replying to{" "}
                  <span className="text-[#1d9bf0]">@{tweet.author?.username}</span>
                </p>
              </div>
            </div>

            {/* Reply composer */}
            <div className="flex space-x-3 mt-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={mediaUrl(user.avatar)} />
                <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                  {user.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  placeholder="Post your reply"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-transparent text-[#e7e9ea] text-[20px] placeholder-[#71767b] outline-none resize-none min-h-[100px] leading-[1.4]"
                  style={{ caretColor: "#1d9bf0" }}
                  autoFocus
                />
              </div>
            </div>

            {/* Audience + Who can reply */}
            <div className="flex items-center space-x-1 ml-14 mb-3">
              <Globe className="h-3.5 w-3.5 text-[#1d9bf0]" />
              <span className="text-[#1d9bf0] text-sm font-bold">{t("Everyone can reply") || "Everyone can reply"}</span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between ml-14 border-t border-[#2f3336] pt-3">
              <div className="flex items-center text-[#1d9bf0] -ml-2">
                <button className="p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                  <span className="text-[13px] font-extrabold leading-none border border-[#1d9bf0] rounded px-1 py-0.5">GIF</span>
                </button>
                <button className="p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors">
                  <Smile className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {content.length > 0 && (
                  <svg viewBox="0 0 32 32" className="h-[28px] w-[28px] -rotate-90">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="#2f3336" strokeWidth="3" />
                    <circle
                      cx="16" cy="16" r="14" fill="none"
                      stroke={isOver ? "#f4212e" : isNear ? "#ffd400" : "#1d9bf0"}
                      strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <button
                  onClick={handleReply}
                  disabled={!content.trim() || loading || isOver}
                  className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-full px-5 py-1.5 text-[15px] transition-colors"
                >
                  {loading ? <LoadingSpinner size="sm" /> : t("reply") || "Reply"}
                </button>
              </div>
            </div>
          </div>

          {/* Existing replies */}
          {repliesLoading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : replies.length > 0 && (
            <div className="border-t border-[#2f3336]">
              {replies.map(r => (
                <div key={r._id} className="flex space-x-3 px-4 py-3 border-b border-[#2f3336] hover:bg-white/[0.02] transition-colors">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={r.author?.avatar} />
                    <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                      {r.author?.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-1 flex-wrap">
                      <span className="font-bold text-[#e7e9ea] text-[15px] hover:underline cursor-pointer">{r.author?.displayName}</span>
                      {r.author?.verified && <VerifiedBadge />}
                      <span className="text-[#71767b] text-[15px]">@{r.author?.username}</span>
                      <span className="text-[#71767b]">·</span>
                      <span className="text-[#71767b] text-[15px]">{formatDate(r.timestamp)}</span>
                    </div>
                    <p 
                      translate="no"
                      className="notranslate text-[#e7e9ea] text-[15px] mt-0.5 whitespace-pre-wrap"
                    >
                      {r.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
