"use client";

import React, { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/context/AuthContext";

interface FollowUser {
  _id: string;
  displayName: string;
  username: string;
  avatar: string;
  verified?: boolean;
}

interface FollowListModalProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

export default function FollowListModal({ userId, type, onClose }: FollowListModalProps) {
  const { user, updateUser } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    axiosInstance.get(`/user/${userId}/${type}`)
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId, type]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/user/follow/${targetId}`, { userId: user._id });
      updateUser({ following: res.data.following });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-black border border-[#2f3336] rounded-2xl w-full max-w-[600px] h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
          <h2 className="text-[#e7e9ea] text-xl font-extrabold capitalize">{type}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#2f3336]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71767b] h-[18px] w-[18px]" />
            <input
              type="text"
              placeholder={`Search ${type}`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] rounded-full text-[15px] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-[#71767b]">
              No users found.
            </div>
          ) : (
            filteredUsers.map(u => {
              const isFollowing = user?.following?.includes(u._id);
              const isSelf = user?._id === u._id;
              
              return (
                <div key={u._id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2f3336] last:border-0 cursor-pointer">
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={u.avatar} alt={u.displayName} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                        {u.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-[#e7e9ea] font-bold text-[15px] truncate hover:underline">
                          {u.displayName}
                        </span>
                        {u.verified && (
                           <svg viewBox="0 0 22 22" className="h-4 w-4 fill-[#1d9bf0] flex-shrink-0">
                             <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                           </svg>
                        )}
                      </div>
                      <span className="text-[#71767b] text-[15px]">@{u.username}</span>
                    </div>
                  </div>
                  {!isSelf && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFollow(u._id); }}
                      className={`flex-shrink-0 font-bold rounded-full px-4 py-1.5 text-sm transition-colors ${
                        isFollowing
                          ? "border border-[#536471] text-[#e7e9ea] hover:border-[#f4212e] hover:text-[#f4212e] hover:bg-[#f4212e]/10"
                          : "bg-[#e7e9ea] text-black hover:bg-[#d7d9db]"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
