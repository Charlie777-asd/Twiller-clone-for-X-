export interface LoginHistoryEntry {
  timestamp: string;
  browser: string;
  os: string;
  deviceCategory: "desktop" | "laptop" | "mobile";
  ipAddress: string;
}

export interface UserSession {
  sessionId: string;
  timestamp: string;
  browser: string;
  os: string;
  deviceCategory: "desktop" | "laptop" | "mobile";
  ipAddress: string;
  isActive: boolean;
}

export interface TwillerUser {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  joinedDate?: string;
  email?: string;
  website?: string;
  location?: string;
  verified?: boolean;
  notificationsEnabled?: boolean;
  isBot?: boolean;
  subscription?: {
    plan: "free" | "bronze" | "silver" | "gold";
    activatedAt?: string | null;
    expiresAt?: string | null;
    orderId?: string | null;
  };
  dailyTweetCount?: number;
  lastTweetDate?: string | null;
  sessionId?: string;
  loginHistory?: LoginHistoryEntry[];
  sessions?: UserSession[];
}

export interface Tweet {
  _id: string;
  author?: TwillerUser;
  content: string;
  image?: string | null;
  audio?: string | null;
  gifUrl?: string | null;
  location?: string | null;
  scheduledAt?: string | null;
  likes?: number;
  retweets?: number;
  comments?: number;
  likedBy?: Array<string | { toString: () => string }>;
  retweetedBy?: Array<string | { toString: () => string }>;
  timestamp?: string;
}

export interface NotificationAlert {
  id: string;
  tweet: Tweet;
  keyword: string;
  timestamp: Date;
}

export const getErrorMessage = (
  error: any,
  fallback = "Something went wrong. Please try again."
) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
};
