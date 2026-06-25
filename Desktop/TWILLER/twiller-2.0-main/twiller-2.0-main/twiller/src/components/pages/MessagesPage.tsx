"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Search, ArrowLeft, X as XIcon, Edit3, Phone, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import LoadingSpinner from "../loading-spinner";
import { useLanguage } from "@/context/LanguageContext";
import { mediaUrl } from "@/lib/backendUrl";

const formatTime = (ts?: string) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchConversations = (isFirstLoad = false) => {
      axiosInstance.get(`/messages/conversations/${user._id}`)
        .then(res => {
          const list = res.data || [];
          setConversations(list);
          if (isFirstLoad && list.length > 0) {
            setActiveConv((prev: any) => prev || list[0]);
          }
        }).catch(console.error);
    };
    fetchConversations(true);
    const interval = setInterval(() => fetchConversations(false), 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!activeConv?._id) return;
    const fetchMessages = (showLoading = false) => {
      if (showLoading) setLoading(true);
      axiosInstance.get(`/messages/${activeConv._id}`)
        .then(res => {
          setMessages(res.data);
          if (showLoading) setLoading(false);
        })
        .catch(() => {
          if (showLoading) setLoading(false);
        });
    };
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [activeConv?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users for new message
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    axiosInstance.get(`/users/list?q=${encodeURIComponent(userSearch)}&userId=${user?._id}`)
      .then(res => setUserResults(res.data)).catch(() => {});
  }, [userSearch, user]);

  const sendMsg = async () => {
    if (!inputVal.trim() || !user || !activeConv) return;
    try {
      const otherUser = activeConv.participants.find((p: any) => p._id !== user._id);
      if (!otherUser) return;
      const res = await axiosInstance.post("/messages", {
        senderId: user._id,
        receiverId: otherUser._id,
        text: inputVal.trim()
      });
      setMessages(prev => [...prev, res.data]);
      setInputVal("");
      setConversations(prev =>
        prev.map(c => c._id === activeConv._id ? { ...c, lastMessage: inputVal.trim() } : c)
      );
    } catch (err) { console.error(err); }
  };

  const startNewConversation = async (targetUser: any) => {
    if (!user) return;
    try {
      await axiosInstance.post("/messages", {
        senderId: user._id,
        receiverId: targetUser._id,
        text: "👋 Hey there!"
      });
      // Reload conversations
      const convRes = await axiosInstance.get(`/messages/conversations/${user._id}`);
      setConversations(convRes.data);
      if (convRes.data.length > 0) setActiveConv(convRes.data[0]);
      setShowNewMsg(false);
      setUserSearch("");
    } catch (err) { console.error(err); }
  };

  const getOtherUser = (conv: any) => conv?.participants?.find((p: any) => p._id !== user?._id) || user;

  const filteredConvs = conversations.filter(c => {
    const other = getOtherUser(c);
    return (other?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            other?.username?.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] md:h-screen min-w-0 overflow-hidden">
      {/* ── Left: Conversation list ─────────────────────────────── */}
      <div className={`${activeConv ? "hidden md:flex" : "flex"} w-full md:w-[350px] flex-shrink-0 border-r border-[#2f3336] flex-col`}>
        <div className="sticky top-0 bg-black/90 backdrop-blur-md px-4 py-3 border-b border-[#2f3336] flex items-center justify-between">
          <h1 className="hidden md:block text-xl font-extrabold text-[#e7e9ea]">{t("Messages")}</h1>
          <button
            aria-label="New message"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setShowNewMsg(true)}
          >
            <Edit3 className="h-5 w-5 text-[#e7e9ea]" strokeWidth={1.75} />
          </button>
        </div>

        {/* Search */}
        <div className="hidden md:block px-4 py-3 border-b border-[#2f3336]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71767b]" />
            <input
              type="text"
              placeholder={t("Search Direct Messages")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1d9bf0] focus:bg-black transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-[#1d9bf0]" />
              </div>
              <h3 className="text-[#e7e9ea] font-extrabold text-xl mb-2 hidden md:block">{t("Welcome to your inbox!")}</h3>
              <p className="text-[#71767b] text-sm hidden md:block">{t("Drop a line, share posts and more with private conversations.")}</p>
              <button
                onClick={() => setShowNewMsg(true)}
                className="mt-4 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full px-5 py-2 text-sm transition-colors hidden md:block"
              >
                {t("New message")}
              </button>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const other = getOtherUser(conv);
              const isActive = activeConv?._id === conv._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConv(conv)}
                  className={`flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-[#2f3336] ${isActive ? "bg-white/5" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={mediaUrl(other?.avatar)} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                        {other?.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[#e7e9ea] font-bold text-[15px] truncate">{other?.displayName}</span>
                      <span className="text-[#71767b] text-xs flex-shrink-0 ml-2">·</span>
                    </div>
                    <p className="text-[#71767b] text-[15px] truncate">{conv.lastMessage || t("Start a conversation…")}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat pane ───────────────────────────────────── */}
      {activeConv ? (
        <div className={`${activeConv ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
          {/* Chat header */}
          <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-[#2f3336] px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <button
                className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-[#e7e9ea] mr-1"
                onClick={() => setActiveConv(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={mediaUrl(getOtherUser(activeConv)?.avatar)} />
                <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-sm">
                  {getOtherUser(activeConv)?.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[#e7e9ea] font-extrabold text-[15px] leading-tight">{getOtherUser(activeConv)?.displayName}</p>
                <p className="text-[#71767b] text-sm">@{getOtherUser(activeConv)?.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#1d9bf0]">
                <Phone className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#1d9bf0]">
                <Info className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={mediaUrl(getOtherUser(activeConv)?.avatar)} />
                  <AvatarFallback className="bg-[#1d9bf0] text-white font-bold text-2xl">
                    {getOtherUser(activeConv)?.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-[#e7e9ea] font-extrabold text-xl">{getOtherUser(activeConv)?.displayName}</h3>
                <p className="text-[#71767b] text-sm">@{getOtherUser(activeConv)?.username}</p>
                <p className="text-[#71767b] text-[15px] mt-3">{t("Start the conversation!")}</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender === user?._id || msg.sender?._id === user?._id;
                const prevMsg = messages[idx - 1];
                const showTime = !prevMsg || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 300000;
                return (
                  <div key={msg._id || idx}>
                    {showTime && (
                      <p className="text-center text-[#71767b] text-xs my-3">{formatTime(msg.createdAt)}</p>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[15px] leading-snug ${
                          isMine
                            ? "bg-[#1d9bf0] text-white rounded-br-sm"
                            : "bg-[#202327] text-[#e7e9ea] rounded-bl-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#2f3336] px-4 py-3 flex items-center space-x-3">
            <div className="flex-1 bg-[#202327] rounded-full flex items-center px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#1d9bf0] transition-all">
              <input
                type="text"
                placeholder={t("Start a new message")}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                className="flex-1 bg-transparent text-[#e7e9ea] text-[15px] placeholder-[#71767b] outline-none"
              />
            </div>
            <button
              onClick={sendMsg}
              disabled={!inputVal.trim()}
              className="w-9 h-9 rounded-full bg-[#1d9bf0] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a8cd8] transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-6 mx-auto">
              <Send className="h-12 w-12 text-[#1d9bf0]" />
            </div>
            <h3 className="text-[#e7e9ea] font-extrabold text-[23px] mb-2">{t("Select a message")}</h3>
            <p className="text-[#71767b] text-[15px] max-w-xs mb-6">
              {t("Choose from your existing conversations, start a new one, or just keep swimming.")}
            </p>
            <button
              onClick={() => setShowNewMsg(true)}
              className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full px-5 py-3 text-[15px] transition-colors"
            >
              {t("New message")}
            </button>
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewMsg && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-14 bg-[#5b7083]/40">
          <div className="bg-black w-full max-w-lg rounded-2xl border border-[#2f3336] shadow-2xl overflow-hidden">
            <div className="flex items-center space-x-4 px-4 py-3 border-b border-[#2f3336]">
              <button onClick={() => { setShowNewMsg(false); setUserSearch(""); setUserResults([]); }} className="p-1.5 rounded-full hover:bg-white/10 text-[#e7e9ea]">
                <XIcon className="h-5 w-5" />
              </button>
              <h2 className="text-[#e7e9ea] font-extrabold text-xl">{t("New message")}</h2>
            </div>
            <div className="px-4 py-3 border-b border-[#2f3336]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71767b]" />
                <input
                  type="text"
                  placeholder={t("Search people")}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#e7e9ea] placeholder-[#71767b] outline-none text-[15px]"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {userResults.length === 0 && userSearch ? (
                <p className="text-[#71767b] text-center py-6 text-sm">No results for "{userSearch}"</p>
              ) : (
                userResults.map(u => (
                  <div
                    key={u._id}
                    onClick={() => startNewConversation(u)}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={mediaUrl(u.avatar)} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">{u.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[#e7e9ea] font-bold text-[15px]">{u.displayName}</p>
                      <p className="text-[#71767b] text-sm">@{u.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
