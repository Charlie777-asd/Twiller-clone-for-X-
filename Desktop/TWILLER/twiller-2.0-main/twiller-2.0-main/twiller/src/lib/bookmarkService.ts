/**
 * Bookmark service — persists bookmarked tweets to localStorage
 */

import type { Tweet } from "./types";

const IDS_KEY = "twiller-bookmark-ids";
const DATA_KEY = "twiller-bookmark-data";

export const getBookmarkedIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(IDS_KEY) || "[]");
  } catch {
    return [];
  }
};

export const getBookmarkedTweets = (): Tweet[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) || "[]");
  } catch {
    return [];
  }
};

export const isBookmarked = (tweetId: string): boolean => {
  return getBookmarkedIds().includes(tweetId);
};

/** Toggle bookmark. Returns true if bookmarked, false if removed. */
export const toggleBookmark = (tweet: Tweet): boolean => {
  const ids = getBookmarkedIds();
  const data = getBookmarkedTweets();
  const idx = ids.indexOf(tweet._id);

  if (idx >= 0) {
    ids.splice(idx, 1);
    const di = data.findIndex((t) => t._id === tweet._id);
    if (di >= 0) data.splice(di, 1);
    localStorage.setItem(IDS_KEY, JSON.stringify(ids));
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return false;
  } else {
    ids.unshift(tweet._id);
    data.unshift(tweet);
    localStorage.setItem(IDS_KEY, JSON.stringify(ids));
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  }
};

export const clearAllBookmarks = (): void => {
  localStorage.removeItem(IDS_KEY);
  localStorage.removeItem(DATA_KEY);
};
