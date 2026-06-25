"use client";

import React, { useState, useEffect, useCallback } from "react";
import { List, Plus, Lock, Globe, Users, ChevronRight, Search, X as XIcon, ArrowLeft, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { Page } from "../layout/Sidebar";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import type { Tweet } from "@/lib/types";
import TweetCard from "../TweetCard";
import LoadingSpinner from "../loading-spinner";

interface ListsPageProps {
  onNavigate?: (page: Page) => void;
}

type ListsTab = "owned" | "subscribed" | "discover";

interface ListType {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  followerCount: number;
  banner: string;
  memberUsernames: string[];
  mine: boolean;
  ownerName: string;
  ownerUsername: string;
  ownerAvatar: string;
}

const INITIAL_MOCK_LISTS: ListType[] = [
  {
    id: "1",
    name: "Tech Leaders",
    description: "Top voices in technology and AI in India",
    isPrivate: false,
    memberCount: 2,
    followerCount: 3420,
    banner: "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["desitech", "desistartup"],
    mine: true,
    ownerName: "You",
    ownerUsername: "me",
    ownerAvatar: "",
  },
  {
    id: "2",
    name: "Crypto & Web3",
    description: "Bitcoin, Ethereum and the future of finance",
    isPrivate: false,
    memberCount: 1,
    followerCount: 1200,
    banner: "https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["paisaletter"],
    mine: true,
    ownerName: "You",
    ownerUsername: "me",
    ownerAvatar: "",
  },
  {
    id: "3",
    name: "🌍 World News",
    description: "Breaking news from around the world",
    isPrivate: false,
    memberCount: 2,
    followerCount: 8900,
    banner: "https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["indiapolitics", "isrodaily"],
    mine: false,
    ownerName: "World News Corp",
    ownerUsername: "news_corp",
    ownerAvatar: "https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=100",
  },
];

const INITIAL_DISCOVER_LISTS: ListType[] = [
  {
    id: "d1",
    name: "🤖 AI & Machine Learning",
    description: "Latest from the world of Artificial Intelligence and Tech",
    isPrivate: false,
    memberCount: 2,
    followerCount: 52000,
    banner: "https://images.pexels.com/photos/8439093/pexels-photo-8439093.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["desitech", "gyanpedia"],
    mine: false,
    ownerName: "Gyanpedia India",
    ownerUsername: "gyanpedia",
    ownerAvatar: "https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=100",
  },
  {
    id: "d2",
    name: "🏏 Cricket Lovers",
    description: "Live cricket scores, commentary and general sports discussions",
    isPrivate: false,
    memberCount: 1,
    followerCount: 24000,
    banner: "https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["iplupdates"],
    mine: false,
    ownerName: "IPL Updates",
    ownerUsername: "iplupdates",
    ownerAvatar: "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=100",
  },
  {
    id: "d3",
    name: "🎬 Movie Buffs",
    description: "Reviews, trailers, and box office news from Bollywood and Regional Cinema",
    isPrivate: false,
    memberCount: 2,
    followerCount: 18200,
    banner: "https://images.pexels.com/photos/1117132/pexels-photo-1117132.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["bollygossip", "cine_masala"],
    mine: false,
    ownerName: "Cine Masala",
    ownerUsername: "cine_masala",
    ownerAvatar: "https://images.pexels.com/photos/33129/popcorn-movie-theater-watch-movie.jpg?auto=compress&cs=tinysrgb&w=100",
  },
  {
    id: "d4",
    name: "💻 Open Source",
    description: "GitHub trending, OSS news and technical updates",
    isPrivate: false,
    memberCount: 1,
    followerCount: 45000,
    banner: "https://images.pexels.com/photos/374631/pexels-photo-374631.jpeg?auto=compress&cs=tinysrgb&w=600",
    memberUsernames: ["desitech"],
    mine: false,
    ownerName: "Desi Tech Insider",
    ownerUsername: "desitech",
    ownerAvatar: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=100",
  },
];

export default function ListsPage({ onNavigate }: ListsPageProps) {
  void onNavigate;
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ListsTab>("owned");
  const [selectedList, setSelectedList] = useState<ListType | null>(null);
  const [listTweets, setListTweets] = useState<Tweet[]>([]);
  const [loadingTweets, setLoadingTweets] = useState(false);

  const [allLists, setAllLists] = useState<ListType[]>(INITIAL_MOCK_LISTS);
  const [discoverLists] = useState<ListType[]>(INITIAL_DISCOVER_LISTS);
  const [subscribedListIds, setSubscribedListIds] = useState<Set<string>>(new Set(["3"])); // News corp subscribed by default

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListPrivate, setNewListPrivate] = useState(false);

  // Load tweets of list members
  const fetchListTweets = useCallback(async (usernames: string[]) => {
    setLoadingTweets(true);
    try {
      const res = await axiosInstance.get("/post");
      const all: Tweet[] = res.data || [];
      const filtered = all.filter(t => t.author && usernames.includes(t.author.username));
      setListTweets(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTweets(false);
    }
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchListTweets(selectedList.memberUsernames);
    }
  }, [selectedList, fetchListTweets]);

  const handleCreate = () => {
    if (!newListName.trim()) return;
    const newList: ListType = {
      id: `custom_${Date.now()}`,
      name: newListName.trim(),
      description: newListDesc.trim(),
      isPrivate: newListPrivate,
      memberCount: 1,
      followerCount: 0,
      banner: "https://images.pexels.com/photos/374631/pexels-photo-374631.jpeg?auto=compress&cs=tinysrgb&w=600",
      memberUsernames: ["desitech"], // Default to add desitech bot
      mine: true,
      ownerName: user?.displayName || "You",
      ownerUsername: user?.username || "me",
      ownerAvatar: user?.avatar || "",
    };
    setAllLists(prev => [newList, ...prev]);
    setNewListName("");
    setNewListDesc("");
    setNewListPrivate(false);
    setShowCreate(false);
  };

  const handleEditSave = () => {
    if (!selectedList || !newListName.trim()) return;
    const updated = {
      ...selectedList,
      name: newListName.trim(),
      description: newListDesc.trim(),
      isPrivate: newListPrivate
    };
    setAllLists(prev => prev.map(l => l.id === selectedList.id ? updated : l));
    setSelectedList(updated);
    setShowEdit(false);
  };

  const handleDeleteList = (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this List?"))) return;
    setAllLists(prev => prev.filter(l => l.id !== id));
    setSelectedList(null);
    setShowEdit(false);
  };

  const toggleSubscribe = (list: ListType) => {
    setSubscribedListIds(prev => {
      const copy = new Set(prev);
      if (copy.has(list.id)) {
        copy.delete(list.id);
        list.followerCount = Math.max(0, list.followerCount - 1);
      } else {
        copy.add(list.id);
        list.followerCount += 1;
      }
      return copy;
    });
  };

  const ownedLists = allLists.filter(l => l.mine);
  const subscribedLists = [...allLists.filter(l => !l.mine && subscribedListIds.has(l.id)), ...discoverLists.filter(l => subscribedListIds.has(l.id))];
  const suggestedLists = discoverLists.filter(l => !subscribedListIds.has(l.id));

  const filteredSuggested = suggestedLists.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.description.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: ListsTab; label: string }[] = [
    { id: "owned", label: t("Your Lists") || "Your Lists" },
    { id: "subscribed", label: t("Subscribed") || "Subscribed" },
    { id: "discover", label: t("Discover") || "Discover" },
  ];

  if (selectedList) {
    const isSubscribed = subscribedListIds.has(selectedList.id);
    const isOwner = selectedList.mine;

    return (
      <div className="min-h-screen relative bg-black text-white pb-12 animate-page-fade">
        {/* Header */}
        <div className="sticky top-14 md:top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336] flex items-center px-4 py-2 gap-6">
          <button 
            onClick={() => setSelectedList(null)} 
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#e7e9ea] leading-tight flex items-center gap-1.5">
              {selectedList.name}
              {selectedList.isPrivate && <Lock size={14} className="text-[#71767b]" />}
            </h1>
            <p className="text-xs text-[#71767b]">{selectedList.memberCount} {t("members") || "members"}</p>
          </div>
          {isOwner && (
            <button
              onClick={() => {
                setNewListName(selectedList.name);
                setNewListDesc(selectedList.description);
                setNewListPrivate(selectedList.isPrivate);
                setShowEdit(true);
              }}
              className="ml-auto flex items-center gap-1 border border-[#536471] hover:bg-white/5 text-[#e7e9ea] font-bold rounded-full px-4 py-1.5 text-xs transition-colors"
            >
              <Edit size={12} />
              <span>{t("Edit List") || "Edit List"}</span>
            </button>
          )}
        </div>

        {/* Cover Banner */}
        <div className="w-full h-44 bg-[#1d1f23] overflow-hidden relative border-b border-[#2f3336]">
          {selectedList.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedList.banner} alt={selectedList.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#1d9bf0]/40 via-[#7856ff]/40 to-[#f91880]/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>

        {/* Profile Card details */}
        <div className="px-4 py-3 border-b border-[#2f3336] space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-extrabold text-[#e7e9ea]">{selectedList.name}</h2>
              <p className="text-[#71767b] text-sm mt-1">{selectedList.description}</p>
            </div>
            {!isOwner && (
              <button
                onClick={() => toggleSubscribe(selectedList)}
                className={`font-bold rounded-full px-5 py-2 text-sm transition-colors ${
                  isSubscribed
                    ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                    : "bg-[#e7e9ea] text-black hover:bg-white"
                }`}
              >
                {isSubscribed ? t("Following") : t("Follow")}
              </button>
            )}
          </div>

          {/* Owner details */}
          <div className="flex items-center gap-2 text-xs text-[#71767b]">
            <span>{t("Created by") || "Created by"}</span>
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={selectedList.ownerAvatar} />
                <AvatarFallback className="text-[7px] bg-[#1d9bf0] text-white">
                  {selectedList.ownerName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[#e7e9ea] font-semibold">{selectedList.ownerName}</span>
              <span className="text-[#71767b]">@{selectedList.ownerUsername}</span>
            </div>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-4 text-sm text-[#71767b]">
            <span className="hover:underline cursor-pointer">
              <strong className="text-[#e7e9ea] font-bold">{selectedList.memberCount}</strong> {t("members") || "members"}
            </span>
            <span className="hover:underline cursor-pointer">
              <strong className="text-[#e7e9ea] font-bold">{selectedList.followerCount.toLocaleString()}</strong> {t("followers") || "followers"}
            </span>
          </div>
        </div>

        {/* List Timeline */}
        <div className="divide-y divide-[#2f3336]">
          <div className="px-4 py-3 border-b border-[#2f3336] bg-black/40">
            <h3 className="text-[#e7e9ea] font-extrabold text-sm uppercase tracking-wider">{t("Tweets") || "Tweets"}</h3>
          </div>
          {loadingTweets ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : listTweets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
                <List className="w-6 h-6 text-[#1d9bf0]" />
              </div>
              <h4 className="text-[#e7e9ea] font-bold text-lg mb-1">{t("No tweets in this List yet") || "No tweets in this List yet"}</h4>
              <p className="text-[#71767b] text-sm max-w-sm">
                {t("When members of this List post something, it will show up here.") || "When members of this List post something, it will show up here."}
              </p>
            </div>
          ) : (
            listTweets.map(tweet => (
              <TweetCard key={tweet._id} tweet={tweet} />
            ))
          )}
        </div>

        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#5b7083]/50 p-4">
            <div className="bg-black border border-[#2f3336] rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white">
                    <XIcon className="h-5 w-5" />
                  </button>
                  <h2 className="text-[#e7e9ea] font-bold text-lg">{t("Edit List") || "Edit List"}</h2>
                </div>
                <button
                  onClick={handleEditSave}
                  disabled={!newListName.trim()}
                  className="bg-[#e7e9ea] hover:bg-white text-black font-bold rounded-full px-4 py-1.5 text-xs transition-colors disabled:opacity-40"
                >
                  {t("Save") || "Save"}
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder=" "
                    id="edit-list-name"
                    maxLength={25}
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="peer w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 pt-5 pb-1.5 text-[#e7e9ea] text-sm outline-none transition-colors"
                  />
                  <label htmlFor="edit-list-name" className="absolute left-3 top-1.5 text-xs text-[#71767b] peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#1d9bf0] transition-all pointer-events-none">
                    {t("Name") || "Name"}
                  </label>
                </div>

                <div className="relative">
                  <textarea
                    placeholder=" "
                    id="edit-list-desc"
                    maxLength={100}
                    rows={3}
                    value={newListDesc}
                    onChange={e => setNewListDesc(e.target.value)}
                    className="peer w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 pt-5 pb-1.5 text-[#e7e9ea] text-sm outline-none transition-colors resize-none"
                  />
                  <label htmlFor="edit-list-desc" className="absolute left-3 top-1.5 text-xs text-[#71767b] peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#1d9bf0] transition-all pointer-events-none">
                    {t("Description") || "Description"}
                  </label>
                </div>

                <div className="flex items-center justify-between py-2.5 border-t border-[#2f3336]">
                  <div>
                    <p className="text-[#e7e9ea] text-sm font-semibold">{t("Make private") || "Make private"}</p>
                    <p className="text-[#71767b] text-xs">{t("Only you can see this List.") || "Only you can see this List."}</p>
                  </div>
                  <button
                    onClick={() => setNewListPrivate(p => !p)}
                    className={`relative w-11 h-5.5 rounded-full transition-colors ${newListPrivate ? "bg-[#1d9bf0]" : "bg-[#536471]"}`}
                  >
                    <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${newListPrivate ? "left-6" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="border-t border-[#2f3336] pt-4">
                  <button
                    onClick={() => handleDeleteList(selectedList.id)}
                    className="w-full py-2.5 border border-[#f4212e]/40 hover:bg-[#f4212e]/10 text-[#f4212e] rounded-full text-sm font-bold transition-colors"
                  >
                    {t("Delete List") || "Delete List"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white animate-page-fade">
      {/* Header */}
      <div className="sticky top-14 md:top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="hidden md:block text-xl font-extrabold text-[#e7e9ea]">{t("Lists")}</h1>
          <button
            onClick={() => {
              setNewListName("");
              setNewListDesc("");
              setNewListPrivate(false);
              setShowCreate(true);
            }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#1d9bf0]"
            aria-label="Create List"
          >
            <Plus className="h-5 w-5" />
          </button>
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

      {/* Search for Discover */}
      {activeTab === "discover" && (
        <div className="px-4 py-3 border-b border-[#2f3336]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b] h-4 w-4" />
            <input
              type="text"
              placeholder={t("Search lists") || "Search lists"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-[15px] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] focus:bg-black transition-all border border-transparent focus:border-[#1d9bf0]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b]">
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lists list */}
      <div className="divide-y divide-[#2f3336]">
        {activeTab === "owned" && (
          ownedLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-5">
                <List className="h-10 w-10 text-[#1d9bf0]" />
              </div>
              <h3 className="text-[#e7e9ea] font-extrabold text-2xl mb-2">{t("You haven't created any Lists yet")}</h3>
              <p className="text-[#71767b] text-[15px] max-w-sm leading-relaxed mb-6">
                {t("When you create a new List, it'll show up here. A List is a curated group of X accounts.")}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full px-6 py-3 transition-colors"
              >
                {t("Create a List")}
              </button>
            </div>
          ) : (
            ownedLists.map(list => (
              <div key={list.id} onClick={() => setSelectedList(list)}>
                <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1d1f23] flex-shrink-0">
                    {list.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={list.banner} alt={list.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1d9bf0] to-[#7856ff]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[#e7e9ea] font-bold text-[15px] truncate">{list.name}</p>
                      {list.isPrivate ? (
                        <Lock size={13} className="text-[#71767b]" />
                      ) : (
                        <Globe size={13} className="text-[#71767b]" />
                      )}
                    </div>
                    <p className="text-[#71767b] text-xs mt-0.5">{list.description}</p>
                    <p className="text-[#71767b] text-[11px] mt-1 font-semibold">{list.memberCount} {t("members")}</p>
                  </div>
                  <ChevronRight size={18} className="text-[#71767b] flex-shrink-0" />
                </div>
              </div>
            ))
          )
        )}

        {activeTab === "subscribed" && (
          subscribedLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-5">
                <List className="h-10 w-10 text-[#1d9bf0]" />
              </div>
              <h3 className="text-[#e7e9ea] font-extrabold text-2xl mb-2">{t("You aren't subscribed to any Lists")}</h3>
              <p className="text-[#71767b] text-[15px] max-w-sm leading-relaxed">
                {t("When you subscribe to a List, it'll show up here. Visit Discover to find Lists to follow.")}
              </p>
            </div>
          ) : (
            subscribedLists.map(list => (
              <div key={list.id} onClick={() => setSelectedList(list)}>
                <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1d1f23] flex-shrink-0">
                    {list.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={list.banner} alt={list.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#ffd400] to-[#f91880]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e7e9ea] font-bold text-[15px] truncate">{list.name}</p>
                    <p className="text-[#71767b] text-xs mt-0.5">{list.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#71767b]">
                      <span>@{list.ownerUsername}</span>
                      <span>•</span>
                      <span>{list.memberCount} {t("members")}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#71767b] flex-shrink-0" />
                </div>
              </div>
            ))
          )
        )}

        {activeTab === "discover" && (
          <div>
            <div className="px-4 py-3">
              <h2 className="text-[#e7e9ea] font-bold text-lg">{t("Suggested Lists")}</h2>
            </div>
            {filteredSuggested.map(list => (
              <div key={list.id} onClick={() => setSelectedList(list)}>
                <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1d1f23] flex-shrink-0">
                    {list.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={list.banner} alt={list.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1d9bf0] to-[#00ba7c]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e7e9ea] font-bold text-[15px] truncate">{list.name}</p>
                    <p className="text-[#71767b] text-xs mt-0.5">{list.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#71767b]">
                      <span className="flex items-center gap-1"><Users size={12} /> {list.memberCount} {t("members")}</span>
                      <span>{list.followerCount.toLocaleString()} {t("followers")}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSubscribe(list); }}
                    className="flex-shrink-0 font-bold bg-[#e7e9ea] hover:bg-white text-black rounded-full px-4 py-1.5 text-xs transition-colors self-center"
                  >
                    {t("Follow")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#5b7083]/50 p-4">
          <div className="bg-black border border-[#2f3336] rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white">
                  <XIcon className="h-5 w-5" />
                </button>
                <h2 className="text-[#e7e9ea] font-bold text-lg">{t("Create a new List")}</h2>
              </div>
              <button
                onClick={handleCreate}
                disabled={!newListName.trim()}
                className="bg-[#e7e9ea] hover:bg-white text-black font-bold rounded-full px-5 py-1.5 text-xs transition-colors disabled:opacity-40"
              >
                {t("Next")}
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder=" "
                  id="list-name"
                  maxLength={25}
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="peer w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 pt-5 pb-1.5 text-[#e7e9ea] text-sm outline-none transition-colors"
                />
                <label htmlFor="list-name" className="absolute left-3 top-1.5 text-xs text-[#71767b] peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#1d9bf0] transition-all pointer-events-none">
                  {t("Name")}
                </label>
              </div>

              <div className="relative">
                <textarea
                  placeholder=" "
                  id="list-desc"
                  maxLength={100}
                  rows={3}
                  value={newListDesc}
                  onChange={e => setNewListDesc(e.target.value)}
                  className="peer w-full bg-transparent border border-[#536471] focus:border-[#1d9bf0] rounded-md px-3 pt-5 pb-1.5 text-[#e7e9ea] text-sm outline-none transition-colors resize-none"
                />
                <label htmlFor="list-desc" className="absolute left-3 top-1.5 text-xs text-[#71767b] peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#1d9bf0] transition-all pointer-events-none">
                  {t("Description")}
                </label>
              </div>

              <div className="flex items-center justify-between py-2.5 border-t border-[#2f3336]">
                <div>
                  <p className="text-[#e7e9ea] text-sm font-semibold">{t("Make private")}</p>
                  <p className="text-[#71767b] text-xs">{t("Only you can see this List.")}</p>
                </div>
                <button
                  onClick={() => setNewListPrivate(p => !p)}
                  className={`relative w-11 h-5.5 rounded-full transition-colors ${newListPrivate ? "bg-[#1d9bf0]" : "bg-[#536471]"}`}
                >
                  <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${newListPrivate ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
