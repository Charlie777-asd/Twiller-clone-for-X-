"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Smile,
  Calendar,
  MapPin,
  BarChart3,
  Globe,
  X,
  Mic,
  ChevronDown,
  Clock,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "./loading-spinner";
import AudioTweetModal from "./AudioTweetModal";
import type { Tweet } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

const EMOJI_LIST = ["😀","😂","🥹","😍","🤔","😎","🥳","😭","🔥","💯","❤️","🎉","👍","🙏","😊","✨","💀","🤣","👀","💪","🎶","🌟","🤯","💬","🫶","😤","😢","🤩","🥰","🫠","😱","🙈","💫","🌈","🎯","🚀","⚡","🌍","🎁","🏆"];
const POLL_DURATIONS = ["1 day", "3 days", "7 days"];

// ── GIF Picker Modal ─────────────────────────────────────────────────────────
const SAMPLE_GIFS = [
  { url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyO/giphy.gif", title: "Happy" },
  { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", title: "Yes" },
  { url: "https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif", title: "Clapping" },
  { url: "https://media.giphy.com/media/xT9IgG50Lg7russbD6/giphy.gif", title: "Wow" },
  { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", title: "Thinking" },
  { url: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif", title: "Fire" },
  { url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif", title: "Cat Typing" },
  { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Nice" },
  { url: "https://media.giphy.com/media/3oFzmrl8XnJlA4o08w/giphy.gif", title: "Laugh" },
  { url: "https://media.giphy.com/media/xT9IgDECMFWl9F3CMg/giphy.gif", title: "Cool" },
  { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif", title: "Awesome" },
  { url: "https://media.giphy.com/media/3oEjHBa34dVLv0jnoc/giphy.gif", title: "Love" },
];

function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = search ? SAMPLE_GIFS.filter(g => g.title.toLowerCase().includes(search.toLowerCase())) : SAMPLE_GIFS;

  return (
    <div className="mb-3 border border-[#2f3336] bg-[#16181c] rounded-2xl overflow-hidden animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
        <p className="text-[#e7e9ea] font-extrabold text-sm">Add GIF</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-[#71767b]"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-3">
        <div className="flex items-center bg-[#202327] rounded-full px-3 py-2 mb-3 gap-2">
          <Search className="h-4 w-4 text-[#71767b]" />
          <input
            type="text"
            placeholder="Search GIFs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[#e7e9ea] text-sm outline-none placeholder-[#71767b]"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto">
          {filtered.map((gif, i) => (
            <button
              key={i}
              onClick={() => { onSelect(gif.url); onClose(); }}
              className="rounded-xl overflow-hidden hover:opacity-80 transition-opacity"
            >
              <img src={gif.url} alt={gif.title} className="w-full h-20 object-cover" loading="lazy" />
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-3 text-center text-[#71767b] text-sm py-4">No GIFs found</p>}
        </div>
      </div>
    </div>
  );
}

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({ onSchedule, onClose }: { onSchedule: (dt: string) => void; onClose: () => void }) {
  const minDate = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [datetime, setDatetime] = useState(minDate);

  return (
    <div className="mb-3 border border-[#2f3336] bg-[#16181c] rounded-2xl overflow-hidden animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#1d9bf0]" />
          <p className="text-[#e7e9ea] font-extrabold text-sm">Schedule Post</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-[#71767b]"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-3">
        <label className="block text-[#71767b] text-xs font-semibold uppercase tracking-wider">Select date and time</label>
        <input
          type="datetime-local"
          value={datetime}
          min={minDate}
          onChange={e => setDatetime(e.target.value)}
          className="w-full bg-[#000] border border-[#536471] focus:border-[#1d9bf0] rounded-xl px-4 py-2.5 text-[#e7e9ea] text-sm outline-none transition-colors"
          style={{ colorScheme: "dark" }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-[#536471] text-[#e7e9ea] font-bold py-2 rounded-full text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSchedule(datetime); onClose(); }}
            className="flex-1 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-2 rounded-full text-sm transition-colors"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Location Modal ────────────────────────────────────────────────────────────
function LocationModal({ onSelect, onClose }: { onSelect: (loc: string) => void; onClose: () => void }) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  const detectLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation is not supported by your browser."); return; }
    setDetecting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          const country = data.address?.country || "";
          const loc = country ? `${city}, ${country}` : city;
          setDetected(loc);
        } catch {
          const loc = `${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`;
          setDetected(loc);
        } finally {
          setDetecting(false);
        }
      },
      () => { setError("Unable to get your location. Please allow location access."); setDetecting(false); }
    );
  };

  return (
    <div className="mb-3 border border-[#2f3336] bg-[#16181c] rounded-2xl overflow-hidden animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#1d9bf0]" />
          <p className="text-[#e7e9ea] font-extrabold text-sm">Tag Location</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-[#71767b]"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-3">
        {error && <p className="text-[#f4212e] text-xs">{error}</p>}
        <button
          onClick={detectLocation}
          disabled={detecting}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#1d9bf0] text-[#1d9bf0] font-bold rounded-full text-sm hover:bg-[#1d9bf0]/10 transition-colors disabled:opacity-50"
        >
          {detecting ? <LoadingSpinner size="sm" /> : <MapPin className="h-4 w-4" />}
          {detecting ? "Detecting…" : "Use my current location"}
        </button>
        {detected && (
          <button
            onClick={() => { onSelect(detected); onClose(); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-full text-[#e7e9ea] text-sm hover:bg-[#1d9bf0]/20 transition-colors"
          >
            <MapPin className="h-4 w-4 text-[#1d9bf0]" />
            <span className="font-semibold">{detected}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[#2f3336]" />
          <span className="text-[#71767b] text-xs">or enter manually</span>
          <div className="flex-1 h-px bg-[#2f3336]" />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Mumbai, India"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="flex-1 bg-[#000] border border-[#536471] focus:border-[#1d9bf0] rounded-xl px-3 py-2 text-[#e7e9ea] text-sm outline-none transition-colors"
          />
          <button
            onClick={() => { if (custom.trim()) { onSelect(custom.trim()); onClose(); } }}
            disabled={!custom.trim()}
            className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold px-4 py-2 rounded-full text-sm transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TweetComposer({ onTweetPosted }: { onTweetPosted: (tweet: Tweet) => void }) {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showPollPanel, setShowPollPanel] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const [audience, setAudience] = useState<"everyone" | "circle">("everyone");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("1 day");
  const [isFocused, setIsFocused] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 280;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await axiosInstance.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImageUrl(res.data?.data?.display_url || "");
    } catch {
      console.error("Image upload failed");
    } finally {
      setImageLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || (!content.trim() && !imageUrl && !gifUrl) || isPosting) return;
    setIsPosting(true);
    try {
      let postContent = content.trim();
      // Auto-translate tweet content if a non-English language is selected
      if (currentLanguage !== "English" && postContent) {
        try {
          const translateRes = await axiosInstance.post("/translate", {
            text: postContent,
            targetLang: currentLanguage,
          });
          if (translateRes.data?.translated) {
            postContent = translateRes.data.translated;
          }
        } catch {
          // If translation fails, post in original language
          console.warn("Auto-translation failed, posting in original language.");
        }
      }
      if (showPollPanel && pollOptions.filter(o => o.trim()).length >= 2) {
        postContent = postContent + `\n\n📊 Poll: ${pollOptions.filter(o=>o.trim()).join(" vs ")}`;
      }
      if (location) postContent = postContent;
      const body: Record<string, unknown> = { author: user._id, content: postContent || " " };
      if (imageUrl) body.image = imageUrl;
      if (gifUrl) body.gifUrl = gifUrl;
      if (location) body.location = location;
      if (scheduledAt) body.scheduledAt = scheduledAt;
      const res = await axiosInstance.post("/post", body);
      onTweetPosted(res.data);
      
      // Dispatch success toast
      window.dispatchEvent(
        new CustomEvent("twiller-notification-received", {
          detail: {
            notification: {
              _id: `posted-${Date.now()}`,
              type: "post",
              content: scheduledAt ? t("Your post has been scheduled.") : t("Your post was sent."),
              sender: user
            }
          }
        })
      );

      setContent("");
      setImageUrl("");
      setGifUrl("");
      setScheduledAt("");
      setLocation("");
      setShowPollPanel(false);
      setPollOptions(["", ""]);
      setIsFocused(false);
      setShowEmojiPanel(false);
      setShowGifPicker(false);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string; limitReached?: boolean; plan?: string; limit?: number } } };
      if (axErr?.response?.data?.limitReached) {
        const plan = axErr.response.data.plan || "free";
        const limit = axErr.response.data.limit || 1;
        const planLabels: Record<string, string> = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold" };
        window.dispatchEvent(new CustomEvent("twiller-tweet-limit", {
          detail: { plan, limit, planLabel: planLabels[plan] || plan }
        }));
      } else {
        console.error(err);
      }
    } finally {
      setIsPosting(false);
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPanel(false);
    textareaRef.current?.focus();
  };

  if (!user) return null;

  const charCount = content.length;
  const isOverLimit = charCount > maxLength;
  const isNearLimit = charCount > maxLength * 0.8;
  const progress = Math.min(charCount / maxLength, 1);
  const circumference = 2 * Math.PI * 14;
  const canPost = !isPosting && !isOverLimit && (content.trim().length > 0 || !!imageUrl || !!gifUrl);

  return (
    <>
      <div className={`border-b border-[#2f3336] px-4 pt-3 pb-2 transition-all`}>
        <div className="flex space-x-3">
          {/* Avatar */}
          <Avatar className="h-11 w-11 flex-shrink-0 mt-0.5">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
              {user.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Audience selector — only when focused */}
            {isFocused && (
              <div className="mb-3 relative animate-scale-up">
                <button
                  onClick={() => setShowAudienceDropdown(!showAudienceDropdown)}
                  className="flex items-center space-x-1 border border-[#1d9bf0] rounded-full px-3 py-0.5 text-[#1d9bf0] text-[13px] font-extrabold hover:bg-[#1d9bf0]/10 transition-all duration-200"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{audience === "everyone" ? t("Everyone can reply") : t("Twiller Circle only")}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showAudienceDropdown && (
                  <div className="absolute left-0 top-8 z-50 w-64 bg-black/90 backdrop-blur-xl border border-[#2f3336] rounded-2xl shadow-2xl py-2 px-1 animate-in fade-in duration-150">
                    <p className="text-[#e7e9ea] font-extrabold text-sm px-4 py-2 border-b border-[#2f3336]/60 mb-1.5">{t("Who can reply?")}</p>
                    {(["everyone", "circle"] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setAudience(opt); setShowAudienceDropdown(false); }}
                        className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl transition-colors text-left ${
                          audience === opt ? "text-[#1d9bf0] bg-[#1d9bf0]/5" : "text-[#e7e9ea] hover:bg-white/5"
                        }`}
                      >
                        <Globe className={`h-4 w-4 ${audience === opt ? "text-[#1d9bf0]" : "text-[#71767b]"}`} />
                        <span className="font-bold text-sm capitalize">{opt === "everyone" ? t("Everyone") : t("Twiller Circle")}</span>
                        {audience === opt && <span className="ml-auto text-sm font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              placeholder={t("what_is_happening")}
              value={content}
              onChange={autoResize}
              onFocus={() => setIsFocused(true)}
              rows={isFocused ? 3 : 1}
              className="w-full bg-transparent text-[#e7e9ea] text-[20px] placeholder-[#71767b] resize-none outline-none leading-[1.4] overflow-hidden min-h-[28px] transition-all"
              style={{ caretColor: "#1d9bf0" }}
              maxLength={maxLength + 50}
            />

            {/* Tags row: location + schedule */}
            {(location || scheduledAt) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {location && (
                  <span className="inline-flex items-center gap-1.5 bg-[#1d9bf0]/10 text-[#1d9bf0] px-3 py-1 rounded-full text-xs font-semibold">
                    <MapPin className="h-3 w-3" />
                    {location}
                    <button onClick={() => setLocation("")} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {scheduledAt && (
                  <span className="inline-flex items-center gap-1.5 bg-[#ffd400]/10 text-[#ffd400] px-3 py-1 rounded-full text-xs font-semibold">
                    <Clock className="h-3 w-3" />
                    {new Date(scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    <button onClick={() => setScheduledAt("")} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Image preview */}
            {imageLoading && (
              <div className="flex items-center justify-center h-32 rounded-2xl border border-[#2f3336] mb-3 bg-[#16181c]">
                <LoadingSpinner size="md" />
              </div>
            )}
            {imageUrl && !imageLoading && (
              <div className="relative mb-3 rounded-2xl overflow-hidden border border-[#2f3336]">
                <img src={imageUrl} alt="Upload preview" className="w-full max-h-[450px] object-cover" />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* GIF preview */}
            {gifUrl && (
              <div className="relative mb-3 rounded-2xl overflow-hidden border border-[#2f3336]">
                <img src={gifUrl} alt="GIF preview" className="w-full max-h-[300px] object-cover" />
                <button
                  onClick={() => setGifUrl("")}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Emoji panel */}
            {showEmojiPanel && (
              <div className="mb-2 p-2 bg-[#16181c] border border-[#2f3336] rounded-2xl grid grid-cols-10 gap-1">
                {EMOJI_LIST.map(em => (
                  <button
                    key={em}
                    onClick={() => insertEmoji(em)}
                    className="text-xl hover:bg-white/10 rounded p-1 transition-colors"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {/* GIF Picker */}
            {showGifPicker && (
              <GifPicker onSelect={setGifUrl} onClose={() => setShowGifPicker(false)} />
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
              <ScheduleModal onSchedule={setScheduledAt} onClose={() => setShowScheduleModal(false)} />
            )}

            {/* Location Modal */}
            {showLocationModal && (
              <LocationModal onSelect={setLocation} onClose={() => setShowLocationModal(false)} />
            )}

            {/* Poll panel */}
            {showPollPanel && (
              <div className="mb-3 border border-[#2f3336] bg-[#16181c]/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#e7e9ea] font-extrabold text-sm">Poll options</p>
                  <button onClick={() => { setShowPollPanel(false); setPollOptions(["", ""]); }} className="p-1 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Choice ${i + 1}${i > 1 ? ' (optional)' : ''}`}
                    maxLength={25}
                    value={opt}
                    onChange={e => {
                      const updated = [...pollOptions];
                      updated[i] = e.target.value;
                      setPollOptions(updated);
                    }}
                    className="w-full bg-[#000]/30 border border-[#2f3336] focus:border-[#1d9bf0] rounded-xl px-4 py-2.5 text-[#e7e9ea] text-sm placeholder-[#71767b] outline-none transition-all duration-200"
                  />
                ))}
                <div className="flex items-center justify-between pt-1">
                  {pollOptions.length < 4 ? (
                    <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-[#1d9bf0] text-xs font-bold hover:underline">
                      + Add choice
                    </button>
                  ) : <div />}
                  <div className="flex items-center space-x-2">
                    <span className="text-[#71767b] text-xs">Duration:</span>
                    {POLL_DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setPollDuration(d)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          pollDuration === d ? "border-[#1d9bf0] bg-[#1d9bf0]/10 text-[#1d9bf0] font-bold" : "border-[#2f3336] text-[#71767b] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Separator */}
            {isFocused && <div className="border-t border-[#2f3336] my-2" />}

            {/* Toolbar + Post button */}
            <div className="flex items-center justify-between -ml-2 pt-1">
              <div className="flex items-center text-[#1d9bf0] space-x-1">
                {/* Image */}
                <button
                  type="button"
                  title="Add image"
                  className="p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40"
                  disabled={imageLoading || !!gifUrl}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                {/* GIF */}
                <button
                  type="button"
                  title="Add GIF"
                  className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 ${showGifPicker || gifUrl ? "bg-[#1d9bf0]/15" : ""}`}
                  onClick={() => { setShowGifPicker(!showGifPicker); setShowScheduleModal(false); setShowLocationModal(false); }}
                  disabled={!!imageUrl}
                >
                  <span className={`text-[11px] font-black leading-none border-2 rounded px-1.5 py-0.5 ${gifUrl ? "border-[#00ba7c] text-[#00ba7c]" : "border-[#1d9bf0]"}`}>GIF</span>
                </button>

                {/* Poll */}
                <button
                  type="button"
                  title="Poll"
                  className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 ${showPollPanel ? "bg-[#1d9bf0]/15" : ""}`}
                  onClick={() => setShowPollPanel(!showPollPanel)}
                >
                  <BarChart3 className="h-5 w-5" />
                </button>

                {/* Emoji */}
                <button
                  type="button"
                  title="Emoji"
                  className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 ${showEmojiPanel ? "bg-[#1d9bf0]/15" : ""}`}
                  onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* Schedule */}
                <button
                  type="button"
                  title="Schedule post"
                  className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 ${scheduledAt ? "text-[#ffd400]" : ""}`}
                  onClick={() => { setShowScheduleModal(!showScheduleModal); setShowGifPicker(false); setShowLocationModal(false); }}
                >
                  <Calendar className="h-5 w-5" />
                </button>

                {/* Audio */}
                <button
                  type="button"
                  title="Audio Tweet"
                  className="p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={() => setShowAudioModal(true)}
                >
                  <Mic className="h-5 w-5" />
                </button>

                {/* Location */}
                <button
                  type="button"
                  title="Add location"
                  className={`p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-all duration-200 hover:scale-105 active:scale-95 ${location ? "text-[#00ba7c]" : ""}`}
                  onClick={() => { setShowLocationModal(!showLocationModal); setShowGifPicker(false); setShowScheduleModal(false); }}
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Character count */}
                {charCount > 0 && (
                  <div className="flex items-center space-x-2 animate-scale-up">
                    {isNearLimit && (
                      <span className={`text-xs font-bold ${isOverLimit ? "text-[#f4212e]" : "text-[#71767b]"}`}>
                        {maxLength - charCount}
                      </span>
                    )}
                    <svg viewBox="0 0 32 32" className="h-[26px] w-[26px] -rotate-90">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="#2f3336" strokeWidth="2.5" />
                      <circle
                        cx="16" cy="16" r="14" fill="none"
                        stroke={isOverLimit ? "#f4212e" : isNearLimit ? "#ffd400" : "#1d9bf0"}
                        strokeWidth="2.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress)}
                        strokeLinecap="round"
                        className="transition-all duration-150"
                      />
                    </svg>
                  </div>
                )}

                {isFocused && <div className="h-6 w-px bg-[#2f3336]" />}

                <button
                  onClick={() => handleSubmit()}
                  disabled={!canPost}
                  className="bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-[0.96] active:bg-[#1570b8] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed text-white font-extrabold rounded-full px-5 py-2 text-[15px] transition-all duration-150 leading-none shadow-md shadow-[#1d9bf0]/10 hover:shadow-[#1d9bf0]/20"
                >
                  {isPosting ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>{scheduledAt ? t("Scheduling…") : t("Posting…")}</span>
                    </span>
                  ) : scheduledAt ? t("Schedule") : t("post")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAudioModal && (
        <AudioTweetModal
          isOpen={showAudioModal}
          onClose={() => setShowAudioModal(false)}
          onTweetPosted={(tweet) => { onTweetPosted(tweet); setShowAudioModal(false); }}
        />
      )}
    </>
  );
}
