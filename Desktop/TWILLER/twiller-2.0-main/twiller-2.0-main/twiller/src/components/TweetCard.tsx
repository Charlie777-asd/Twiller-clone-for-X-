"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Bookmark,
  Link2, Trash2, UserMinus, VolumeX, Flag, BadgeAlert, X as XIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import type { Tweet } from "@/lib/types";
import ReplyModal from "./ReplyModal";
import TranslatedText from "./TranslatedText";

function VerifiedBadge({ plan }: { plan?: string }) {
  let fillClass = "fill-[#1d9bf0]";
  if (plan === "gold") fillClass = "fill-[#ffd400]";
  else if (plan === "silver") fillClass = "fill-[#c0c0c0]";
  else if (plan === "bronze") fillClass = "fill-[#cd7f32]";

  return (
    <svg viewBox="0 0 22 22" className={`h-[18px] w-[18px] ${fillClass} flex-shrink-0 inline-block`}>
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

interface TweetCardProps {
  tweet: Tweet;
  onDeleted?: (tweetId: string) => void;
}

export default function TweetCard({ tweet, onDeleted }: TweetCardProps) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [tweetState, setTweetState] = useState(tweet);
  const [bookmarked, setBookmarked] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [deleted, setDeleted] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const [gifPlaying, setGifPlaying] = useState(true);

  useEffect(() => {
    if (user?.accessibilityPrefs) {
      setGifPlaying(user.accessibilityPrefs.autoplayGifs ?? true);
    }
  }, [user?.accessibilityPrefs]);

  // Custom animations and lightbox states
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isRepostAnimating, setIsRepostAnimating] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Custom audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    if (tweet?._id && user?.bookmarks) {
      setBookmarked((user.bookmarks as string[]).includes(tweet._id));
    }
  }, [tweet?._id, user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const likeTweet = async () => {
    if (!user) return;
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 500);
    try {
      const res = await axiosInstance.post(`/like/${tweetState._id}`, { userId: user._id });
      setTweetState(res.data);
    } catch (error) { console.error(error); }
  };

  const retweetTweet = async () => {
    if (!user) return;
    setIsRepostAnimating(true);
    setTimeout(() => setIsRepostAnimating(false), 500);
    try {
      const res = await axiosInstance.post(`/retweet/${tweetState._id}`, { userId: user._id });
      setTweetState(res.data);
    } catch (error) { console.error(error); }
  };

  const handleBookmark = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/user/bookmark/${tweetState._id}`, { email: user.email });
      const nowBookmarked = res.data.bookmarks.includes(tweetState._id);
      setBookmarked(nowBookmarked);
      if (res.data.bookmarks) {
        updateUser({ bookmarks: res.data.bookmarks });
      }
      setShareMsg(nowBookmarked ? "Added to Bookmarks" : "Removed from Bookmarks");
      setTimeout(() => setShareMsg(""), 2500);
      window.dispatchEvent(new CustomEvent("twiller-bookmarks-changed"));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!user || tweetState.author?._id !== user._id) return;
    setMoreOpen(false);
    try {
      await axiosInstance.delete(`/post/${tweetState._id}`, { data: { userId: user._id } });
      setDeleted(true);
      onDeleted?.(tweetState._id);
    } catch (err) { console.error(err); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${tweetState._id}`);
    setShareMsg("Copied to clipboard");
    setShareOpen(false);
    setTimeout(() => setShareMsg(""), 2500);
  };

  const formatNumber = (num: number) => {
    if (!num) return "";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / 1000;
      if (diff < 60) return `${Math.floor(diff)}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 86400 * 7) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return ""; }
  };

  if (deleted) return null;

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tweetState.author?._id) {
      window.dispatchEvent(new CustomEvent("twiller-view-user", { detail: tweetState.author._id }));
    }
  };

  const userId = user?._id?.toString();
  const isLiked = tweetState.likedBy?.some((id) => id?.toString() === userId);
  const isRetweeted = tweetState.retweetedBy?.some((id) => id?.toString() === userId);
  const commentsCount = tweetState.comments ?? 0;
  const retweetsCount = tweetState.retweets ?? 0;
  const likesCount = tweetState.likes ?? 0;
  const isOwnTweet = tweetState.author?._id === userId;

  if (!tweetState.author) return null;

  return (
    <>
      <article
        className="px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-[#2f3336] relative"
        onClick={() => setIsReplyOpen(true)}
      >
        {/* Retweet label */}
        {isRetweeted && (
          <div className="flex items-center space-x-2 text-[#71767b] text-[13px] mb-1.5 ml-9">
            <Repeat2 className="h-3.5 w-3.5" />
            <span className="font-semibold">You reposted</span>
          </div>
        )}

        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar 
              className="h-10 w-10 hover:opacity-90 transition-opacity cursor-pointer"
              onClick={handleUserClick}
            >
              <AvatarImage src={mediaUrl(tweetState.author.avatar)} alt={tweetState.author.displayName} />
              <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-sm">
                {tweetState.author.displayName?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            {/* Author row */}
            <div className="flex items-start justify-between mb-0.5">
              <div className="flex items-center space-x-1 min-w-0 mr-2 flex-wrap">
                <span 
                  className="font-bold text-[#e7e9ea] text-[15px] hover:underline cursor-pointer truncate"
                  onClick={handleUserClick}
                >
                  {tweetState.author.displayName}
                </span>
                {tweetState.author.verified && <VerifiedBadge plan={tweetState.author.subscription?.plan} />}
                <span className="text-[#71767b] text-[15px] truncate">@{tweetState.author.username}</span>
                <span className="text-[#71767b] text-[15px] flex-shrink-0">·</span>
                <span className="text-[#71767b] text-[15px] flex-shrink-0 hover:underline">
                  {formatDate(tweetState.timestamp)}
                </span>
              </div>

              {/* More dropdown */}
              <div className="relative flex-shrink-0" ref={moreRef}>
                <button
                  aria-label="More"
                  className="p-1.5 rounded-full hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] text-[#71767b] transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMoreOpen(!moreOpen); }}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {moreOpen && (
                  <div
                    className="absolute right-0 top-8 z-50 w-64 bg-black border border-[#2f3336] rounded-2xl shadow-xl overflow-hidden py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isOwnTweet ? (
                      <button
                        onClick={handleDelete}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-[#f4212e] hover:bg-[#f4212e]/10 transition-colors text-[15px] font-bold"
                      >
                        <Trash2 className="h-5 w-5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <>
                        <button className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]">
                          <UserMinus className="h-5 w-5 text-[#71767b]" />
                          <span>Unfollow @{tweetState.author.username}</span>
                        </button>
                        <button className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]">
                          <VolumeX className="h-5 w-5 text-[#71767b]" />
                          <span>Mute @{tweetState.author.username}</span>
                        </button>
                        <button className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]">
                          <BadgeAlert className="h-5 w-5 text-[#71767b]" />
                          <span>Block @{tweetState.author.username}</span>
                        </button>
                        <div className="border-t border-[#2f3336] my-1" />
                        <button className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]">
                          <Flag className="h-5 w-5 text-[#71767b]" />
                          <span>Report post</span>
                        </button>
                      </>
                    )}
                    <div className="border-t border-[#2f3336] my-1" />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]"
                    >
                      <Link2 className="h-5 w-5 text-[#71767b]" />
                      <span>Copy link to post</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div 
              translate="no"
              className="notranslate text-[#e7e9ea] text-[15px] leading-[1.5] mb-3 whitespace-pre-wrap break-words"
            >
              {tweetState.content}
            </div>

            {/* Image */}
            {tweetState.image && (
              <div 
                className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] bg-black max-h-[510px] flex items-center justify-center transition-all duration-300 hover:brightness-95 hover:scale-[1.005]"
                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
              >
                <img
                  src={mediaUrl(tweetState.image)}
                  alt="Tweet media"
                  className="w-full h-auto max-h-[510px] object-cover cursor-zoom-in"
                />
              </div>
            )}

            {/* GIF */}
            {tweetState.gifUrl && (
              <div 
                className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] bg-black relative cursor-pointer"
                onClick={(e) => {
                  if (!gifPlaying) {
                    e.stopPropagation();
                    setGifPlaying(true);
                  }
                }}
              >
                {gifPlaying ? (
                  <img src={mediaUrl(tweetState.gifUrl)} alt="GIF" className="w-full max-h-[400px] object-cover" />
                ) : (
                  <div className="w-full h-[250px] bg-zinc-900 flex items-center justify-center relative">
                    <div className="w-12 h-12 rounded-full bg-black/80 flex items-center justify-center border border-white/20 hover:scale-110 transition-transform">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">GIF (Autoplay off)</div>
                  </div>
                )}
                {gifPlaying && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">GIF</div>}
              </div>
            )}

            {/* Location tag */}
            {tweetState.location && (
              <div className="mb-2 flex items-center gap-1 text-[#1d9bf0] text-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span className="hover:underline cursor-pointer">{tweetState.location}</span>
              </div>
            )}

            {/* Premium Custom Audio Player */}
            {tweetState.audio && (
              <div 
                className="mb-3 p-4 bg-gradient-to-r from-[#16181c] to-[#0c0d0e] border border-[#2f3336] rounded-2xl flex items-center space-x-3.5 shadow-md shadow-black/40" 
                onClick={(e) => e.stopPropagation()}
              >
                <audio
                  ref={audioRef}
                  src={mediaUrl(tweetState.audio)}
                  onTimeUpdate={onTimeUpdate}
                  onLoadedMetadata={onLoadedMetadata}
                  onEnded={onAudioEnded}
                  preload="metadata"
                  className="hidden"
                />
                
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-md shadow-[#1d9bf0]/20"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#e7e9ea] text-xs font-bold tracking-wide flex items-center space-x-1">
                      <span>🎵 Voice Post</span>
                      {isPlaying && (
                        <span className="flex space-x-0.5 items-end h-3 ml-1.5 pb-0.5">
                          <span className="w-0.5 bg-[#1d9bf0] animate-bounce" style={{ animationDuration: '0.6s' }}></span>
                          <span className="w-0.5 bg-[#1d9bf0] animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.15s' }}></span>
                          <span className="w-0.5 bg-[#1d9bf0] animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.3s' }}></span>
                        </span>
                      )}
                    </span>
                    <span className="text-[#71767b] text-[11px] font-mono">
                      {formatAudioTime(currentTime)} / {formatAudioTime(duration || 0)}
                    </span>
                  </div>
                  
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSliderChange}
                    className="premium-audio-slider"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              className="flex items-center justify-between max-w-[425px] -ml-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Reply */}
              <button
                aria-label="Reply"
                className="flex items-center space-x-1.5 p-2 rounded-full hover:bg-[#1d9bf0]/10 text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
                onClick={() => setIsReplyOpen(true)}
              >
                <MessageCircle className="h-[18px] w-[18px] transition-transform duration-150" />
                {commentsCount > 0 && <span className="text-xs group-hover:text-[#1d9bf0] transition-colors">{formatNumber(commentsCount)}</span>}
              </button>

              {/* Retweet */}
              <button
                onClick={() => retweetTweet()}
                aria-label={isRetweeted ? "Undo repost" : t("repost")}
                className={`flex items-center space-x-1.5 p-2 rounded-full hover:bg-[#00ba7c]/10 transition-colors group ${
                  isRetweeted ? "text-[#00ba7c]" : "text-[#71767b] hover:text-[#00ba7c]"
                }`}
              >
                <Repeat2 className={`h-[18px] w-[18px] transition-transform duration-150 ${
                  isRepostAnimating ? "animate-repost-spin" : isRetweeted ? "scale-110" : ""
                }`} />
                {retweetsCount > 0 && <span className="text-xs group-hover:text-[#00ba7c] transition-colors">{formatNumber(retweetsCount)}</span>}
              </button>

              {/* Like */}
              <button
                onClick={() => likeTweet()}
                aria-label={isLiked ? "Unlike" : t("like")}
                className={`flex items-center space-x-1.5 p-2 rounded-full hover:bg-[#f91880]/10 transition-colors group ${
                  isLiked ? "text-[#f91880]" : "text-[#71767b] hover:text-[#f91880]"
                }`}
              >
                <Heart className={`h-[18px] w-[18px] transition-all duration-150 ${
                  isLiked ? "fill-current" : ""
                } ${
                  isLikeAnimating ? "animate-heart-pop" : isLiked ? "scale-110" : ""
                }`} />
                {likesCount > 0 && <span className="text-xs group-hover:text-[#f91880] transition-colors">{formatNumber(likesCount)}</span>}
              </button>

              {/* Bookmark */}
              <button
                onClick={handleBookmark}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
                className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors group ${
                  bookmarked ? "text-[#1d9bf0]" : "text-[#71767b] hover:text-[#1d9bf0]"
                }`}
              >
                <Bookmark className={`h-[18px] w-[18px] transition-transform duration-150 ${bookmarked ? "fill-current scale-110" : "group-hover:scale-105"}`} />
              </button>

              {/* Share */}
              <div className="relative" ref={shareRef}>
                <button
                  aria-label={t("share")}
                  className="p-2 rounded-full hover:bg-[#1d9bf0]/10 text-[#71767b] hover:text-[#1d9bf0] transition-colors group"
                  onClick={() => setShareOpen(!shareOpen)}
                >
                  <Share2 className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-105" />
                </button>

                {shareOpen && (
                  <div className="absolute bottom-full right-0 mb-1 z-50 w-56 bg-black border border-[#2f3336] rounded-2xl shadow-xl overflow-hidden py-1">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]"
                    >
                      <Link2 className="h-5 w-5 text-[#71767b]" />
                      <span>Copy link</span>
                    </button>
                    <button
                      onClick={handleBookmark}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-[#e7e9ea] hover:bg-white/5 transition-colors text-[15px]"
                    >
                      <Bookmark className="h-5 w-5 text-[#71767b]" />
                      <span>{bookmarked ? "Remove from Bookmarks" : "Bookmark"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox / Fullscreen Image Viewer Modal */}
        {isLightboxOpen && tweetState.image && (
          <div
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-[#e7e9ea] hover:bg-white/10 transition-colors"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close image viewer"
            >
              <XIcon className="h-6 w-6" />
            </button>
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={mediaUrl(tweetState.image)}
                alt="Post attachment fullscreen"
                className="w-auto h-auto max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-scale-up"
              />
            </div>
          </div>
        )}

        {/* Toast notification */}
        {shareMsg && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] bg-[#1d9bf0] text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-2xl pointer-events-none animate-in fade-in slide-in-from-bottom-2">
            {shareMsg}
          </div>
        )}
      </article>

      {isReplyOpen && (
        <ReplyModal
          tweet={tweetState}
          isOpen={isReplyOpen}
          onClose={() => setIsReplyOpen(false)}
          onReplyAdded={() => setTweetState(prev => ({ ...prev, comments: (prev.comments || 0) + 1 }))}
        />
      )}
    </>
  );
}
