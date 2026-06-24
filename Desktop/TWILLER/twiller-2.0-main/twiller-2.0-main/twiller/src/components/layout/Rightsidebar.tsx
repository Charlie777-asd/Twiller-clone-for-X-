"use client";

import { Search, X as XIcon } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import type { Tweet } from "@/lib/types";

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0] flex-shrink-0 inline-block">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

export default function RightSidebar() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Tweet[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [showMoreTrending, setShowMoreTrending] = useState(false);
  const [showMoreFollow, setShowMoreFollow] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.following) {
      const init: Record<string, boolean> = {};
      (user.following as string[]).forEach(id => { init[id] = true; });
      setFollowing(init);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    axiosInstance.get(`/users/suggestions?userId=${user._id}`)
      .then(res => setSuggestions(res.data)).catch(() => {});
    axiosInstance.get("/trending")
      .then(res => setTrending(res.data)).catch(() => {});
  }, [user]);

  // Search with debounce
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchValue.trim()) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axiosInstance.get(`/post/search?q=${encodeURIComponent(searchValue)}`);
        setSearchResults(res.data.slice(0, 5));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchValue]);

  const toggleFollow = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/user/follow/${id}`, { userId: user._id });
      const newFollowing: string[] = res.data.following || [];
      setFollowing(prev => ({ ...prev, [id]: newFollowing.includes(id) }));
      updateUser({ following: newFollowing });
    } catch (err) { console.error(err); }
  };

  const loadMoreSuggestions = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/users/suggestions?userId=${user._id}`);
      setSuggestions(res.data);
      setShowMoreFollow(true);
    } catch { }
  };

  const displayedTrending = showMoreTrending ? trending : trending.slice(0, 5);
  const displayedSuggestions = showMoreFollow ? suggestions : suggestions.slice(0, 3);

  return (
    <div className="w-full max-w-[350px] py-2 space-y-4">
      {/* Search */}
      <div className="sticky top-0 pt-2 pb-2 bg-black z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b] h-[18px] w-[18px] pointer-events-none transition-colors duration-200 group-focus-within:text-[#1d9bf0]" />
          <input
            type="text"
            placeholder={t("Search")}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-[15px] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] focus:bg-black transition-all border border-transparent focus:border-[#1d9bf0]"
          />
          {searchValue && (
            <button
              onClick={() => { setSearchValue(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchValue.trim() && (
          <div className="mt-1.5 bg-black/90 backdrop-blur-xl border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-scale-up animate-in fade-in duration-150">
            {searchLoading ? (
              <div className="px-4 py-3.5 text-[#71767b] text-sm text-center">{t("Searching…")}</div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3.5 text-[#71767b] text-sm text-center">{t("No results for")} "{searchValue}"</div>
            ) : (
              searchResults.map(tweet => (
                <div key={tweet._id} className="px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer border-b border-[#2f3336] last:border-0">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={tweet.author?.avatar} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white text-[8px] font-bold">{tweet.author?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[#e7e9ea] text-xs font-bold hover:underline">{tweet.author?.displayName}</span>
                    <span className="text-[#71767b] text-xs">@{tweet.author?.username}</span>
                  </div>
                  <p className="text-[#e7e9ea] text-sm line-clamp-2 leading-relaxed">{tweet.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Subscribe to Premium */}
      <div className="bg-[#16181c] border border-[#2f3336]/40 rounded-2xl p-4 shadow-md shadow-black/10">
        <h3 className="text-[#e7e9ea] text-xl font-extrabold mb-1">{t("subscribe_premium") || "Subscribe to Premium"}</h3>
        <p className="text-[#e7e9ea] text-[15px] mb-3.5 leading-snug">
          {t("subscribe_unlock_desc") || "Subscribe to unlock new features and if eligible, receive a share of revenue."}
        </p>
        <button 
          className="bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white font-extrabold rounded-full px-5 py-2.5 text-[14px] transition-all shadow-md shadow-[#1d9bf0]/10 hover:shadow-[#1d9bf0]/20"
          onClick={() => window.dispatchEvent(new CustomEvent("twiller-navigate", { detail: "premium" }))}
        >
          {t("subscribe") || "Subscribe"}
        </button>
      </div>

      {/* What's happening */}
      {trending.length > 0 && (
        <div className="bg-[#16181c] rounded-2xl overflow-hidden">
          <h3 className="text-[#e7e9ea] text-xl font-extrabold px-4 pt-4 pb-1">{t("whats_happening") || "What's happening"}</h3>
          <div>
            {displayedTrending.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("twiller-search-trend", { detail: item.topic }));
                  window.dispatchEvent(new CustomEvent("twiller-navigate", { detail: "explore" }));
                }}
                className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group border-b border-[#2f3336] last:border-0"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#71767b] text-xs">{t("trending") || "Trending"} · {item.posts} {t("posts") || "posts"}</p>
                    <p className="text-[#e7e9ea] font-bold text-[15px] group-hover:text-[#1d9bf0] transition-colors mt-0.5 truncate">
                      {item.topic}
                    </p>
                  </div>
                  {item.posts > 5 && (
                    <span className="ml-3 text-[10px] font-bold text-[#ff6314] bg-[#ff6314]/10 px-2 py-0.5 rounded-full flex-shrink-0 self-center">
                      {t("HOT") || "HOT"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {trending.length > 5 && (
            <button
              onClick={() => setShowMoreTrending(!showMoreTrending)}
              className="text-[#1d9bf0] hover:text-[#1a8cd8] text-[15px] px-4 py-3 w-full text-left hover:bg-white/5 transition-colors"
            >
              {showMoreTrending ? (t("show_less") || "Show less") : (t("show_more") || "Show more")}
            </button>
          )}
        </div>
      )}

      {/* Who to follow */}
      {suggestions.length > 0 && (
        <div className="bg-[#16181c] rounded-2xl overflow-hidden">
          <h3 className="text-[#e7e9ea] text-xl font-extrabold px-4 pt-4 pb-1">{t("who_to_follow") || "Who to follow"}</h3>
          <div>
            {displayedSuggestions.map((person) => (
              <div
                key={person._id}
                className="px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2f3336] last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <Avatar 
                      className="h-10 w-10 flex-shrink-0 cursor-pointer"
                      onClick={() => window.dispatchEvent(new CustomEvent("twiller-view-user", { detail: person._id }))}
                    >
                      <AvatarImage src={person.avatar} alt={person.displayName} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                        {person.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span 
                          className="text-[#e7e9ea] font-bold text-[15px] truncate hover:underline cursor-pointer"
                          onClick={() => window.dispatchEvent(new CustomEvent("twiller-view-user", { detail: person._id }))}
                        >
                          {person.displayName}
                        </span>
                        {person.verified && <VerifiedBadge />}
                      </div>
                      <span className="text-[#71767b] text-[15px]">@{person.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(person._id)}
                    className={`flex-shrink-0 font-bold rounded-full px-4 py-1.5 text-sm transition-colors ${
                      following[person._id]
                        ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                        : "bg-[#e7e9ea] text-black hover:bg-[#d7d9db]"
                    }`}
                  >
                    {following[person._id] ? (t("following") || "Following") : (t("follow") || "Follow")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={loadMoreSuggestions}
            className="text-[#1d9bf0] hover:text-[#1a8cd8] text-[15px] px-4 py-3 w-full text-left hover:bg-white/5 transition-colors"
          >
            {t("show_more") || "Show more"}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#71767b]">
          {[
            t("terms_of_service") || "Terms of Service",
            t("privacy_policy") || "Privacy Policy",
            t("cookie_policy") || "Cookie Policy",
            t("accessibility") || "Accessibility",
            t("ads_info") || "Ads info",
            t("More") || "More"
          ].map(link => (
            <a key={link} href="#" className="hover:underline" onClick={e => e.preventDefault()}>
              {link}
            </a>
          ))}
        </div>
        <p className="text-[#71767b] text-xs mt-2">© 2025 X Corp.</p>
      </div>
    </div>
  );
}
