"use client";

import React, { useEffect, useState, useRef } from "react";
import { Star, X, Heart, UserPlus, Repeat2, AtSign, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ToastItem {
  id: string;
  type: "like" | "follow" | "retweet" | "mention" | "interest" | "post" | "message";
  sender?: {
    avatar?: string;
    displayName: string;
    username: string;
  };
  content: string;
  extra?: string;
}

const notifConfig: Record<string, { icon: React.ReactNode; title: string; color: string }> = {
  like:     { icon: <Heart className="h-3.5 w-3.5 fill-[#f91880] text-[#f91880]" />,   title: "New Like",      color: "bg-[#f91880]/10" },
  follow:   { icon: <UserPlus className="h-3.5 w-3.5 text-[#1d9bf0]" />,               title: "New Follower",  color: "bg-[#1d9bf0]/10" },
  retweet:  { icon: <Repeat2 className="h-3.5 w-3.5 text-[#00ba7c]" />,                title: "Repost",        color: "bg-[#00ba7c]/10" },
  mention:  { icon: <AtSign className="h-3.5 w-3.5 text-[#1d9bf0]" />,                 title: "Mention / Reply", color: "bg-[#1d9bf0]/10" },
  interest: { icon: <Star className="h-3.5 w-3.5 fill-[#ffd400] text-[#ffd400]" />,    title: "Interest Match", color: "bg-[#ffd400]/10" },
  post:     { icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#1d9bf0]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>, title: "Post Sent", color: "bg-[#1d9bf0]/10" },
  message:  { icon: <Mail className="h-3.5 w-3.5 text-[#1d9bf0]" />,                  title: "New Message",    color: "bg-[#1d9bf0]/10" },
};

function triggerNativeNotification(notification: any) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const senderName = notification.sender?.displayName || "Someone";
  let title = "New Notification";
  let body = notification.content || "";

  if (notification.type === "like") {
    title = `New Like from ${senderName}`;
    body = `liked your post ${notification.extra || ""}`;
  } else if (notification.type === "follow") {
    title = `New Follower`;
    body = `${senderName} followed you`;
  } else if (notification.type === "retweet") {
    title = `Repost from ${senderName}`;
    body = `reposted your post ${notification.extra || ""}`;
  } else if (notification.type === "mention") {
    title = `Mention / Reply from ${senderName}`;
    body = notification.content + (notification.extra ? `: ${notification.extra}` : "");
  } else if (notification.type === "interest") {
    title = `Interest Match with ${senderName}`;
    body = notification.content + (notification.extra ? `: ${notification.extra}` : "");
  } else if (notification.type === "post") {
    title = `Post Published`;
    body = `${senderName} posted: ${notification.extra || ""}`;
  } else if (notification.type === "message") {
    title = `New Message from ${senderName}`;
    body = notification.extra || "sent you a message";
  }

  try {
    const nativeNotif = new Notification(title, {
      body,
      icon: notification.sender?.avatar || "/favicon.ico",
      badge: "/favicon.ico",
      tag: `twiller-notification-${notification._id}`,
    });
    nativeNotif.onclick = () => {
      window.focus();
      nativeNotif.close();
    };
    setTimeout(() => nativeNotif.close(), 6000);
  } catch (err) {
    console.warn("Browser notification error:", err);
  }
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const handleKeyword = (e: Event) => {
      const { tweet, keyword } = (e as CustomEvent).detail;
      const id = `toast-keyword-${tweet._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newToast: ToastItem = {
        id,
        type: "interest",
        sender: tweet.author,
        content: `posted about #${keyword}`,
        extra: tweet.content,
      };

      setToasts(prev => [newToast, ...prev].slice(0, 3));
      timers.current[id] = setTimeout(() => dismiss(id), 6000);

      // Trigger native notification
      triggerNativeNotification({
        _id: tweet._id,
        type: "interest",
        sender: tweet.author,
        content: `posted about #${keyword}`,
        extra: tweet.content
      });
    };

    const handleNotification = (e: Event) => {
      const { notification } = (e as CustomEvent).detail;
      
      // If it's a polled 'post' notification (not the instant one generated locally in TweetComposer.tsx),
      // we don't want to show a duplicate toast/native notification.
      if (notification.type === "post" && !notification._id?.startsWith("posted-")) {
        return;
      }

      const id = `toast-notif-${notification._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newToast: ToastItem = {
        id,
        type: notification.type,
        sender: notification.sender,
        content: notification.content,
        extra: notification.extra,
      };

      setToasts(prev => [newToast, ...prev].slice(0, 3));
      timers.current[id] = setTimeout(() => dismiss(id), 6000);

      // Trigger native notification
      triggerNativeNotification(notification);
    };

    window.addEventListener("twiller-keyword-detected", handleKeyword);
    window.addEventListener("twiller-notification-received", handleNotification);

    const activeTimers = timers.current;
    return () => {
      window.removeEventListener("twiller-keyword-detected", handleKeyword);
      window.removeEventListener("twiller-notification-received", handleNotification);
      Object.values(activeTimers).forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes twiller-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes twiller-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .twiller-toast-enter {
          animation: twiller-slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .twiller-progress {
          animation: twiller-shrink 6s linear forwards;
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2.5 w-[360px] pointer-events-none">
        {toasts.map((toast, i) => {
          const config = notifConfig[toast.type] || notifConfig.mention;
          return (
            <div
              key={toast.id}
              className="twiller-toast-enter pointer-events-auto bg-black border border-[#2f3336] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden"
              style={{
                opacity: 1 - i * 0.18,
                transform: `scale(${1 - i * 0.025}) translateY(${i * -6}px)`,
              }}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2f3336]">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className="text-[#e7e9ea] text-xs font-bold">
                    {config.title}
                  </span>
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="p-1 rounded-full hover:bg-white/10 text-[#71767b] hover:text-[#e7e9ea] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {toast.sender && (
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={toast.sender.avatar} alt={toast.sender.displayName} />
                      <AvatarFallback className="bg-[#1d9bf0] text-white text-sm font-bold">
                        {toast.sender.displayName?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    {toast.sender && (
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[#e7e9ea] font-bold text-[15px] leading-tight">
                          {toast.sender.displayName}
                        </span>
                        <span className="text-[#71767b] text-[15px]">
                          @{toast.sender.username}
                        </span>
                      </div>
                    )}
                    <p className="text-[#e7e9ea] text-[14px] leading-snug break-words">
                      {toast.content}
                    </p>
                    {toast.extra && (
                      <p className="text-[#71767b] text-xs italic mt-1.5 pl-2 border-l border-[#2f3336] truncate">
                        {toast.extra}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Progress bar ── */}
              <div className="h-[3px] bg-[#2f3336]">
                <div className="twiller-progress h-full bg-[#1d9bf0]" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
