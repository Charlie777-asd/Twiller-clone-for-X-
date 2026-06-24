"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, CalendarDays, Link as LinkIcon, MapPin, MonitorSmartphone, Globe, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import TweetCard from "../TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
import LoadingSpinner from "../loading-spinner";
import type { Tweet } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function UserProfilePage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { user: currentUser, updateUser } = useAuth();
  const { t } = useLanguage();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tweetsLoading, setTweetsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    setLoading(true);
    axiosInstance.get(`/user/${userId}`)
      .then(res => setProfileUser(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!profileUser?._id) return;
    setTweetsLoading(true);
    axiosInstance.get(`/post/user/${profileUser._id}`)
      .then(res => setTweets(res.data || []))
      .catch(() => {})
      .finally(() => setTweetsLoading(false));
  }, [profileUser?._id]);

  const toggleFollow = async () => {
    if (!currentUser || !profileUser) return;
    try {
      const res = await axiosInstance.post(`/user/follow/${profileUser._id}`, { userId: currentUser._id });
      updateUser({ following: res.data.following });
      
      // Update local profileUser follower count
      const isFollowing = res.data.following.includes(profileUser._id);
      setProfileUser((prev: any) => ({
        ...prev,
        followers: isFollowing 
          ? [...(prev.followers || []), currentUser._id]
          : (prev.followers || []).filter((id: string) => id !== currentUser._id)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-4 text-center text-[#71767b]">{t("User not found")}</div>
    );
  }

  const isFollowing = currentUser?.following?.includes(profileUser._id);

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-20 sm:pb-0">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="flex items-center px-4 py-2 gap-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition duration-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-1">
              {profileUser.displayName}
              {profileUser.verified && (
                <svg viewBox="0 0 22 22" className="h-5 w-5 fill-[#1d9bf0]">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </h2>
            <p className="text-sm text-[#71767b]">{tweets.length} {t("posts")}</p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 sm:h-48 bg-[#333639] w-full" />

      <div className="px-4">
        {/* Profile Info */}
        <div className="flex justify-between items-start relative -top-12 sm:-top-16 mb-4">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-black bg-black">
            <AvatarImage src={mediaUrl(profileUser.avatar)} className="object-cover" />
            <AvatarFallback className="text-2xl bg-[#1d9bf0] text-white">
              {profileUser.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="mt-16 sm:mt-20">
            {currentUser?._id !== profileUser._id && (
              <button
                onClick={toggleFollow}
                className={`font-bold rounded-full px-4 sm:px-5 py-1.5 sm:py-2 text-[15px] transition-colors ${
                  isFollowing
                    ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                    : "bg-[#e7e9ea] text-black hover:bg-[#d7d9db]"
                }`}
              >
                {isFollowing ? t("Following") : t("Follow")}
              </button>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="-mt-8 sm:-mt-12 mb-4">
          <h1 className="text-xl font-bold flex items-center gap-1">
            {profileUser.displayName}
            {profileUser.verified && (
               <svg viewBox="0 0 22 22" className="h-5 w-5 fill-[#1d9bf0]">
                 <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
               </svg>
            )}
          </h1>
          <p className="text-[#71767b] text-[15px]">@{profileUser.username}</p>
          
          {profileUser.bio && (
            <div className="mt-3 text-[15px] leading-snug break-words">
              {profileUser.bio}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[#71767b] text-[15px]">
            {profileUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser.website && (
              <div className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                <a href={profileUser.website} target="_blank" rel="noreferrer" className="text-[#1d9bf0] hover:underline">
                  {profileUser.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              <span>{t("Joined")} {new Date(profileUser.joinedDate || Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          </div>

          <div className="flex items-center space-x-5 text-[15px] mt-3">
            <div className="hover:underline cursor-pointer">
              <span className="text-[#e7e9ea] font-bold">{profileUser.following?.length || 0}</span>
              <span className="text-[#71767b] ml-1">{t("Following")}</span>
            </div>
            <div className="hover:underline cursor-pointer">
              <span className="text-[#e7e9ea] font-bold">{profileUser.followers?.length || 0}</span>
              <span className="text-[#71767b] ml-1">{t("Followers")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2f3336]">
        {[{ id: "posts", label: t("Posts") }, ...(currentUser?._id === profileUser._id ? [{ id: "login_history", label: t("Login History") }] : [])].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 text-[15px] font-semibold transition-colors relative hover:bg-white/5 ${
              activeTab === tab.id ? "text-[#e7e9ea]" : "text-[#71767b]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="divide-y divide-[#2f3336]">
        {activeTab === "posts" && (
          tweetsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : tweets.length === 0 ? (
            <div className="p-8 text-center text-[#71767b]">{t("No posts yet")}</div>
          ) : (
            tweets.map((tweet) => (
              <TweetCard key={tweet._id} tweet={tweet} onDeleted={() => {}} />
            ))
          )
        )}
        
        {activeTab === "login_history" && currentUser?._id === profileUser._id && (
          <div className="p-4 space-y-4">
            <div className="bg-[#16181c] border border-[#2f3336] p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-[#1d9bf0] mt-0.5" />
              <div>
                <h3 className="text-[#e7e9ea] font-bold text-sm">Account Security</h3>
                <p className="text-[#71767b] text-xs leading-relaxed mt-1">This is a log of recent sign-ins to your account. If you see any suspicious activity, please change your password immediately.</p>
              </div>
            </div>
            {profileUser.loginHistory && profileUser.loginHistory.length > 0 ? (
              [...profileUser.loginHistory].reverse().map((record: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between p-4 bg-[#0a0a0a] border border-[#2f3336] rounded-xl hover:bg-[#16181c] transition-colors">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center shrink-0">
                      {record.deviceCategory === "mobile" ? <MonitorSmartphone className="w-5 h-5 text-[#1d9bf0]" /> : <Globe className="w-5 h-5 text-[#1d9bf0]" />}
                    </div>
                    <div>
                      <p className="text-[#e7e9ea] font-bold text-[15px]">{record.browser} on {record.os}</p>
                      <p className="text-[#71767b] text-[13px] mt-0.5">{record.deviceCategory === "mobile" ? "Mobile App/Browser" : "Desktop Browser"}</p>
                      <p className="text-[#71767b] text-[13px] mt-0.5">{new Date(record.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#71767b] text-xs font-mono bg-[#16181c] px-2 py-1 rounded">{record.ipAddress}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#71767b]">No login history found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
