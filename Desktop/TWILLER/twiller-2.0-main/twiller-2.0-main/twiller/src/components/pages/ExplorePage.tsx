"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X as XIcon, TrendingUp, Sparkles, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axiosInstance from "@/lib/axiosInstance";
import TweetCard from "../TweetCard";
import LoadingSpinner from "../loading-spinner";
import type { Tweet } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl } from "@/lib/backendUrl";

const categories = ["For you", "Trending", "News", "Sports", "Entertainment", "Technology"];

// Static fallback trends for India localization per category
const categoryTrends: Record<string, Array<{ category: string; topic: string; posts: string; hot: boolean; img: string | null }>> = {
  "For you": [
    { category: "Technology · Trending", topic: "#UPI", posts: "1.2M posts", hot: true, img: null },
    { category: "Cricket · Trending", topic: "#IPL2026", posts: "521K posts", hot: true, img: "https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400" },
    { category: "Science · Trending", topic: "#ISRO", posts: "203K posts", hot: true, img: null },
    { category: "Politics · Trending", topic: "#IndiaElections", posts: "88.2K posts", hot: false, img: null }
  ],
  "Trending": [
    { category: "India · Trending", topic: "#BSE_Sensex", posts: "145K posts", hot: true, img: null },
    { category: "Trending in Delhi", topic: "#MumbaiRains", posts: "98K posts", hot: false, img: null },
    { category: "India · Trending", topic: "#VandeBharat", posts: "76K posts", hot: false, img: null },
    { category: "Fintech · Trending", topic: "#ONDC", posts: "112K posts", hot: true, img: null },
    { category: "Science · Trending", topic: "#Chandrayaan4", posts: "245K posts", hot: true, img: null }
  ],
  "News": [
    { category: "Politics · Trending", topic: "#Budget2026", posts: "312K posts", hot: true, img: null },
    { category: "Elections · Trending", topic: "#IndiaElections", posts: "88.2K posts", hot: false, img: null },
    { category: "Judiciary · Trending", topic: "#SupremeCourt", posts: "45K posts", hot: false, img: null },
    { category: "Taxation · Trending", topic: "#GST", posts: "62K posts", hot: false, img: null }
  ],
  "Sports": [
    { category: "Cricket · Trending", topic: "#IPL2026", posts: "521K posts", hot: true, img: "https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400" },
    { category: "Sports · Trending", topic: "Virat Kohli", posts: "384K posts", hot: false, img: null },
    { category: "Athletics · Trending", topic: "#NeerajChopra", posts: "92K posts", hot: true, img: null },
    { category: "Football · Trending", topic: "#BlueTigers", posts: "38K posts", hot: false, img: null }
  ],
  "Entertainment": [
    { category: "Entertainment · Trending", topic: "#Bollywood", posts: "97.3K posts", hot: false, img: null },
    { category: "Music · Trending", topic: "#ArijitSingh", posts: "155K posts", hot: false, img: null },
    { category: "Tollywood · Trending", topic: "#Pushpa2", posts: "189K posts", hot: true, img: null },
    { category: "Kollywood · Trending", topic: "#CineMasala", posts: "72K posts", hot: false, img: null }
  ],
  "Technology": [
    { category: "Technology · Trending", topic: "#UPI", posts: "1.2M posts", hot: true, img: null },
    { category: "Startup · Trending", topic: "#BengaluruTech", posts: "231K posts", hot: false, img: null },
    { category: "AI · Trending", topic: "#AIIndia", posts: "167K posts", hot: true, img: null },
    { category: "SaaS · Trending", topic: "#SaaS", posts: "41K posts", hot: false, img: null }
  ]
};

const staticSuggestions = [
  { id: "s1", username: "desitech", displayName: "Desi Tech Insider", avatar: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400", verified: true, bio: "India's daily dose of technology news and startups 🇮🇳💻" },
  { id: "s2", username: "isrodaily", displayName: "ISRO Daily", avatar: "https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg?auto=compress&cs=tinysrgb&w=400", verified: true, bio: "Exploring India's frontiers in space and science 🚀🛰️" },
  { id: "s3", username: "iplupdates", displayName: "IPL Updates", avatar: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=400", verified: true, bio: "Live cricket coverage and breaking news 🏏🏆" },
];

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0] flex-shrink-0 inline-block">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

export default function ExplorePage() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("For you");
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Search state
  const [searchResults, setSearchResults] = useState<Tweet[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState<"Top" | "Latest" | "People" | "Media">("Top");
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Global feed content
  const [allTweets, setAllTweets] = useState<Tweet[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [trendingFromApi, setTrendingFromApi] = useState<Array<{ topic: string; posts: number }>>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch trending list and all tweets for categorised timelines
  const fetchGlobalData = useCallback(async () => {
    try {
      setLoadingFeed(true);
      const [trendRes, postsRes] = await Promise.all([
        axiosInstance.get("/trending"),
        axiosInstance.get("/post")
      ]);
      setTrendingFromApi(trendRes.data || []);
      setAllTweets(postsRes.data || []);
    } catch (err) {
      console.error("Failed to load explore data:", err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  // Fetch suggestions dynamically from API
  useEffect(() => {
    if (!user?._id) return;
    axiosInstance.get(`/users/suggestions?userId=${user._id}`)
      .then(res => setSuggestions(res.data.slice(0, 3)))
      .catch(() => {});
  }, [user]);

  // Sync following map from user object
  useEffect(() => {
    if (user?.following) {
      const init: Record<string, boolean> = {};
      (user.following as string[]).forEach(id => { init[id] = true; });
      setFollowing(init);
    }
  }, [user]);

  // Listen for trending search clicks from RightSidebar
  useEffect(() => {
    const handleSearchTrend = (e: any) => {
      setSearch(e.detail);
      setActiveSearchTab("Top");
    };
    window.addEventListener("twiller-search-trend", handleSearchTrend);
    return () => {
      window.removeEventListener("twiller-search-trend", handleSearchTrend);
    };
  }, []);

  // Execute Search trigger
  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axiosInstance.get(`/post/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Fetch People Search
  const runPeopleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPeopleResults([]);
      return;
    }
    setPeopleLoading(true);
    try {
      const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(query)}`);
      setPeopleResults(res.data || []);
    } catch (err) {
      console.error(err);
      setPeopleResults([]);
    } finally {
      setPeopleLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setSearchResults([]);
      setPeopleResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(search);
      if (activeSearchTab === "People") {
        runPeopleSearch(search);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, activeSearchTab, runSearch, runPeopleSearch]);

  // If search tab changes to People, execute search for people immediately
  useEffect(() => {
    if (search.trim() && activeSearchTab === "People") {
      runPeopleSearch(search);
    }
  }, [activeSearchTab, search, runPeopleSearch]);

  const handleFollow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/user/follow/${id}`, { userId: user._id });
      const newFollowing: string[] = res.data.following || [];
      setFollowing(prev => ({ ...prev, [id]: newFollowing.includes(id) }));
      if (typeof updateUser === "function") {
        updateUser({ following: newFollowing });
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const handleUserNavigate = (userId: string) => {
    if (userId) {
      window.dispatchEvent(new CustomEvent("twiller-view-user", { detail: userId }));
    }
  };

  const handleTrendClick = (topic: string) => {
    setSearch(topic);
    setActiveSearchTab("Top");
  };

  // Merge dynamic hashtags from API with fallback category lists
  const getTrendsForCategory = () => {
    const fallback = categoryTrends[activeCategory] || categoryTrends["For you"];
    if (activeCategory === "Trending" && trendingFromApi.length > 0) {
      return trendingFromApi.map((t, idx) => ({
        category: `Trending in India · #${idx + 1}`,
        topic: t.topic,
        posts: `${t.posts} posts`,
        hot: t.posts > 3,
        img: null
      }));
    }
    return fallback;
  };

  // Filter tweets category-wise
  const getFilteredTimeline = () => {
    if (activeCategory === "For you") {
      return allTweets;
    }
    
    return allTweets.filter(tweet => {
      const authorName = tweet.author?.username?.toLowerCase() || "";
      const content = tweet.content?.toLowerCase() || "";

      switch (activeCategory) {
        case "Sports":
          return (
            authorName === "iplupdates" ||
            authorName === "desigamer" ||
            content.includes("cricket") ||
            content.includes("ipl") ||
            content.includes("sport") ||
            content.includes("football") ||
            content.includes("athletics") ||
            content.includes("gold") ||
            content.includes("medal") ||
            content.includes("championship") ||
            content.includes("match")
          );
        case "Technology":
          return (
            authorName === "desitech" ||
            authorName === "desistartup" ||
            authorName === "isrodaily" ||
            content.includes("upi") ||
            content.includes("technology") ||
            content.includes("ai") ||
            content.includes("coding") ||
            content.includes("developer") ||
            content.includes("startup") ||
            content.includes("software") ||
            content.includes("saas") ||
            content.includes("isro") ||
            content.includes("space")
          );
        case "News":
          return (
            authorName === "indiapolitics" ||
            authorName === "gyanpedia" ||
            content.includes("election") ||
            content.includes("budget") ||
            content.includes("politics") ||
            content.includes("court") ||
            content.includes("ruling") ||
            content.includes("news") ||
            content.includes("fact") ||
            content.includes("trivia") ||
            content.includes("infrastructure")
          );
        case "Entertainment":
          return (
            authorName === "bollygossip" ||
            authorName === "musicindia" ||
            authorName === "cine_masala" ||
            authorName === "indianart" ||
            authorName === "desi_couture" ||
            authorName === "desi_reads" ||
            content.includes("bollywood") ||
            content.includes("cinema") ||
            content.includes("movie") ||
            content.includes("music") ||
            content.includes("concert") ||
            content.includes("art") ||
            content.includes("painting") ||
            content.includes("fashion") ||
            content.includes("dupatta") ||
            content.includes("lehenga") ||
            content.includes("poetry") ||
            content.includes("book") ||
            content.includes("reads")
          );
        default:
          return false;
      }
    });
  };

  // Sort and filter search results based on sub-tabs
  const getProcessedSearchResults = () => {
    if (activeSearchTab === "Latest") {
      // Sort strictly by timestamp descending
      return [...searchResults].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }
    if (activeSearchTab === "Media") {
      // Show only tweets containing images
      return searchResults.filter(tweet => !!tweet.image);
    }
    // "Top": Sort by priority (likes + retweets descending)
    return [...searchResults].sort((a, b) => ((b.likes || 0) + (b.retweets || 0)) - ((a.likes || 0) + (a.retweets || 0)));
  };

  const processedResults = getProcessedSearchResults();

  return (
    <div className="min-h-screen pb-10">
      {/* Sticky Search Header */}
      <div className="sticky top-16 md:top-0 bg-black/90 backdrop-blur-md z-10 px-4 pt-3 pb-0 border-b border-[#2f3336]">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b] h-[18px] w-[18px] pointer-events-none" />
          <input
            type="text"
            placeholder={t("Search X")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1d9bf0] focus:bg-black transition-all border border-transparent focus:border-[#1d9bf0]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-white">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Explore Categories (Visible when no search query is active) */}
        {!search && (
          <div className="flex overflow-x-auto scrollbar-none -mx-4 px-4 space-x-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  // Scroll to top of categories content
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-colors relative ${
                  activeCategory === cat ? "text-[#e7e9ea]" : "text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/5"
                }`}
              >
                {t(cat)}
                {activeCategory === cat && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-10 bg-[#1d9bf0] rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Search Results Sub-Tabs (Visible ONLY when search query is active) */}
        {search && (
          <div className="flex -mx-4 px-4 border-t border-[#2f3336] mt-2">
            {(["Top", "Latest", "People", "Media"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSearchTab(tab)}
                className={`flex-1 py-3 text-center text-sm font-bold transition-all relative ${
                  activeSearchTab === tab ? "text-white" : "text-[#71767b] hover:text-white"
                }`}
              >
                {t(tab)}
                {activeSearchTab === tab && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {search.trim() ? (
        /* ── SEARCH RESULTS MODE ── */
        <div>
          {searchLoading && activeSearchTab !== "People" ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-[#71767b] text-sm mt-4">{t("Searching for")} &quot;{search}&quot;…</p>
            </div>
          ) : activeSearchTab === "People" ? (
            /* People search sub-tab */
            <div className="divide-y divide-[#2f3336]">
              {peopleLoading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>
              ) : peopleResults.length === 0 ? (
                <div className="text-center py-16 text-[#71767b]">
                  <UserIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("No users found matching")} &quot;{search}&quot;</p>
                </div>
              ) : (
                peopleResults.map(p => (
                  <div
                    key={p._id}
                    onClick={() => handleUserNavigate(p._id)}
                    className="px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarImage src={mediaUrl(p.avatar)} className="object-cover" />
                        <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">{p.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-[#e7e9ea] font-bold text-[15px] hover:underline truncate">{p.displayName}</span>
                          {p.verified && <VerifiedBadge />}
                        </div>
                        <span className="text-[#71767b] text-[14px]">@{p.username}</span>
                        {p.bio && <p className="text-[#e7e9ea] text-xs mt-0.5 line-clamp-1">{p.bio}</p>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleFollow(p._id, e)}
                      className={`flex-shrink-0 font-bold rounded-full px-4 py-1.5 text-xs transition-colors ${
                        following[p._id] || user?.following?.includes(p._id)
                          ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                          : "bg-[#e7e9ea] text-black hover:bg-[#d7d9db]"
                      }`}
                    >
                      {following[p._id] || user?.following?.includes(p._id) ? t("Following") : t("Follow")}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : processedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <h3 className="text-[#e7e9ea] font-extrabold text-xl mb-2">{t("No results for")} &ldquo;{search}&rdquo;</h3>
              <p className="text-[#71767b] text-sm leading-relaxed max-w-xs">
                {t("Try checking spelling or search for something else.")}
              </p>
            </div>
          ) : (
            /* Tweets results feed list */
            <div className="divide-y divide-[#2f3336]">
              <div className="px-4 py-3 border-b border-[#2f3336] flex items-center justify-between">
                <p className="text-[#71767b] text-xs">{t("Found")} <span className="font-bold text-[#e7e9ea]">{processedResults.length}</span> {t("posts")}</p>
                <button onClick={() => setSearch("")} className="text-[#1d9bf0] text-xs hover:underline">{t("Clear")}</button>
              </div>
              {processedResults.map(tweet => (
                <TweetCard key={tweet._id} tweet={tweet} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── DEFAULT CATEGORY EXPLORE VIEW ── */
        <div>
          {/* Featured Hero Banner (Visible on 'For you' and 'Sports') */}
          {(activeCategory === "For you" || activeCategory === "Sports") && (
            <div className="relative overflow-hidden cursor-pointer" onClick={() => handleTrendClick("#IPL2026")}>
              <div className="h-52 relative">
                <img
                  src="https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="IPL Cricket featured"
                  className="w-full h-full object-cover brightness-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-[#1d9bf0]" />
                    <span className="text-[#1d9bf0] text-xs uppercase tracking-wider font-extrabold">Cricket · LIVE NOW</span>
                  </div>
                  <h2 className="text-[#e7e9ea] text-2xl font-black">#IPL2026</h2>
                  <p className="text-zinc-300 text-xs mt-1">Join the stadium chatter live from Wankhede Stadium. Virat Kohli and Rohit Sharma face off tonight!</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            {/* Category-specific Trends box */}
            <div className="px-4">
              <h2 className="text-[#e7e9ea] font-black text-lg mb-3">
                {activeCategory === "For you" ? t("Trends for you") : `${activeCategory} ${t("Trends")}`}
              </h2>
              <div className="rounded-2xl border border-[#2f3336] bg-[#16181c]/30 overflow-hidden mb-6">
                {getTrendsForCategory().map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleTrendClick(item.topic)}
                    className="px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer group flex items-start justify-between border-b border-[#2f3336] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[#71767b] text-xs">{item.category}</p>
                      <p className="text-[#e7e9ea] font-extrabold text-[15px] group-hover:text-[#1d9bf0] transition-colors mt-0.5 truncate">
                        {item.topic}
                      </p>
                      <p className="text-[#71767b] text-[11px] mt-0.5">{item.posts}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0 self-center">
                      {item.hot && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#ff6314] bg-[#ff6314]/10 px-2 py-0.5 rounded-full border border-[#ff6314]/20 flex items-center gap-0.5">
                          <Sparkles size={8} /> HOT
                        </span>
                      )}
                      {item.img && (
                        <img src={item.img} alt={item.topic} className="w-14 h-12 rounded-xl object-cover border border-[#2f3336]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Who to Follow Suggested Users Card */}
            {activeCategory === "For you" && suggestions.length > 0 && (
              <div className="px-4">
                <h2 className="text-[#e7e9ea] font-black text-lg mb-3">{t("Who to follow")}</h2>
                <div className="rounded-2xl border border-[#2f3336] bg-[#16181c]/30 overflow-hidden mb-6">
                  {suggestions.map(p => (
                    <div
                      key={p._id}
                      onClick={() => handleUserNavigate(p._id)}
                      className="px-4 py-3.5 hover:bg-white/5 transition-colors flex items-center justify-between border-b border-[#2f3336] last:border-0 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={mediaUrl(p.avatar)} className="object-cover" />
                          <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">{p.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-[#e7e9ea] font-bold text-[14px] hover:underline">{p.displayName}</span>
                            {p.verified && <VerifiedBadge />}
                          </div>
                          <span className="text-[#71767b] text-xs">@{p.username}</span>
                          <p className="text-zinc-400 text-xs mt-0.5 line-clamp-1">{p.bio}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleFollow(p._id, e)}
                        className={`flex-shrink-0 font-extrabold rounded-full px-4 py-1.5 text-xs transition-colors ${
                          following[p._id]
                            ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                            : "bg-[#e7e9ea] text-black hover:bg-[#d7d9db]"
                        }`}
                      >
                        {following[p._id] ? t("Following") : t("Follow")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category-Specific Timeline (Interactive Live Feed) */}
            <div className="border-t border-[#2f3336] mt-4">
              <div className="px-4 py-3">
                <h3 className="text-[#e7e9ea] font-black text-lg">
                  {activeCategory === "For you" ? t("What's happening") : `${activeCategory} ${t("Feed")}`}
                </h3>
              </div>
              {loadingFeed ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>
              ) : getFilteredTimeline().length === 0 ? (
                <div className="text-center py-12 text-[#71767b] text-sm">
                  {t("No posts available in this category yet.")}
                </div>
              ) : (
                <div className="divide-y divide-[#2f3336]">
                  {getFilteredTimeline().map(tweet => (
                    <TweetCard key={tweet._id} tweet={tweet} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
