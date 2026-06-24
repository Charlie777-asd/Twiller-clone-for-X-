import type { NotificationAlert, Tweet } from "./types";

// ── Fixed keyword list ──────────────────────────────────────────────────────
export const NOTIFICATION_KEYWORDS = ["cricket", "science"];

// ── Keys for persistence ────────────────────────────────────────────────────
const PREF_KEY           = "twiller-notifications-enabled";
const NOTIFIED_TWEETS_KEY = "twiller-notified-tweets";

// ── Runtime state ───────────────────────────────────────────────────────────
const getInitialNotified = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = localStorage.getItem(NOTIFIED_TWEETS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

const notifiedTweetIds = getInitialNotified();
const notificationHistory: NotificationAlert[] = [];

// Current user's personal interests — updated by Feed when user loads
let _userInterests: string[] = [];

/** Call this from Feed/Auth when the user's interests change */
export const setUserInterests = (interests: string[]): void => {
  _userInterests = (interests || []).map(i => i.toLowerCase().replace(/^#/, ""));
};

// ── Permission helpers ──────────────────────────────────────────────────────
export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const getPermissionStatus = (): string => {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const isNotificationsEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(PREF_KEY);
  if (stored === null) return true;
  return stored === "true";
};

export const setNotificationsEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, String(enabled));
};

export const syncNotificationPreference = (enabled?: boolean): void => {
  if (typeof enabled === "boolean") setNotificationsEnabled(enabled);
};

// ── Matching helpers ────────────────────────────────────────────────────────

/** Returns the matched keyword (cricket/science) or null */
export const checkForKeyword = (content: string): string | null => {
  if (!content) return null;
  const lower = content.toLowerCase();
  return NOTIFICATION_KEYWORDS.find(k => lower.includes(k)) ?? null;
};

/** Returns all matched user interests (e.g. ["cricket"]) */
export const checkForInterests = (content: string): string[] => {
  if (!content || _userInterests.length === 0) return [];
  const lower = content.toLowerCase();
  // Match both plain word and #hashtag form
  return _userInterests.filter(interest =>
    lower.includes(interest) || lower.includes(`#${interest}`)
  );
};

// ── History ─────────────────────────────────────────────────────────────────
export const getNotificationHistory = () => [...notificationHistory];
export const getNotificationCount  = () => notificationHistory.length;

// ── Core: process a single tweet ────────────────────────────────────────────
export const sendTweetNotification = (tweet: Tweet): void => {
  const tweetId = tweet?._id;
  if (!tweetId) return;

  const content = tweet.content || "";

  // Check both fixed keywords AND user's personal interests
  const keyword  = checkForKeyword(content);
  const matchedInterests = checkForInterests(content);

  if (!keyword && matchedInterests.length === 0) return;     // no match
  if (!isNotificationsEnabled())  return; // user disabled notifications

  const terms: string[] = [];
  if (keyword) terms.push(keyword);
  matchedInterests.forEach(i => {
    if (!terms.includes(i)) terms.push(i);
  });

  terms.forEach(matchedTerm => {
    const uniqueKey = `${tweetId}:${matchedTerm}`;
    if (notifiedTweetIds.has(uniqueKey)) return;

    // Mark as notified
    notifiedTweetIds.add(uniqueKey);
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTIFIED_TWEETS_KEY, JSON.stringify(Array.from(notifiedTweetIds)));
    }

    const historyEntry: NotificationAlert = { id: uniqueKey, tweet, keyword: matchedTerm, timestamp: new Date() };
    notificationHistory.unshift(historyEntry);

    // Fire in-app toast event (consumed by NotificationToast.tsx)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("twiller-keyword-detected", {
          detail: { tweet, keyword: matchedTerm },
        })
      );
    }

    // Fire browser OS-level notification
    if (!isNotificationSupported() || Notification.permission !== "granted") return;

    const authorName = tweet.author?.displayName || "Someone";
    try {
      const notification = new Notification(
        `"${matchedTerm}" mentioned by ${authorName}`,
        {
          body: content,
          icon: tweet.author?.avatar || "/favicon.ico",
          badge: "/favicon.ico",
          tag: `twiller-tweet-${uniqueKey}`,
          requireInteraction: false,
          silent: false,
        }
      );
      notification.onclick = () => { window.focus(); notification.close(); };
      window.setTimeout(() => notification.close(), 6000);
    } catch (err) {
      console.warn("Browser notification error:", err);
    }
  });
};

export const processTweetsForNotifications = (tweets: Tweet[]): void => {
  if (!Array.isArray(tweets)) return;
  tweets.forEach(tweet => sendTweetNotification(tweet));
};
