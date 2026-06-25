"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import { encodeEmailPath } from "@/lib/backendUrl";
import { getErrorMessage, LoginHistoryEntry, UserSession } from "@/lib/types";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  joinedDate: string;
  email: string;
  phone?: string;
  website: string;
  location: string;
  verified?: boolean;
  notificationsEnabled?: boolean;
  notificationPrefs?: {
    likes: boolean;
    retweets: boolean;
    follows: boolean;
    mentions: boolean;
    email: boolean;
  };
  privacySettings?: {
    protectedTweets: boolean;
    dmFromAnyone: boolean;
  };
  bookmarks?: string[];
  followers?: string[];
  following?: string[];
  interests?: string[];
  passwordHash?: string;
  lastPasswordChange?: string;
  isActive?: boolean;
  accessibilityPrefs?: {
    reduceMotion: boolean;
    highContrast: boolean;
    colorBlindMode: boolean;
    autoplayGifs: boolean;
    autoplayVideos: boolean;
  };
  displayPrefs?: {
    fontSize: number;
    colorAccent: string;
    backgroundTheme: string;
  };
  subscription?: {
    plan: "free" | "bronze" | "silver" | "gold";

    activatedAt?: string | null;
    expiresAt?: string | null;
    orderId?: string | null;
  };
  dailyTweetCount?: number;
  lastTweetDate?: string | null;
  language?: string;
  sessionId?: string;
  loginHistory?: LoginHistoryEntry[];
  sessions?: UserSession[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<any>;
  loginWithPhone: (phone: string, password: string, phoneVerified?: boolean) => Promise<any>;
  signup: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  signupWithPhone: (phone: string, password: string, username: string, displayName: string, phoneVerified?: boolean) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    coverImage: string;
  }) => Promise<void>;
  updateUser: (newData: Partial<User>) => void;
  verifyLoginOTP: (email: string, otp: string) => Promise<void>;
  setUserPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  verifyUserPassword: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const fbErr = (code: string): string => {
  const map: Record<string, string> = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please check and try again.",
    "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
    "auth/weak-password": "Password is too weak. Please use at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
    "auth/cancelled-popup-request": "",
  };
  return map[code] ?? "Authentication failed. Please try again.";
};

const DEFAULT_AVATAR = "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (localStorage.getItem("logout-pending") === "true") {
        localStorage.removeItem("logout-pending");
        setUser(null);
        setIsLoading(false);
        try {
          await signOut(auth);
        } catch { /* ignore */ }
        return;
      }
      if (fbUser?.email) {
        try {
          let ud = null;
          try {
            const res = await axiosInstance.get("/loggedinuser", { params: { email: fbUser.email } });
            if (res.data?._id) {
              ud = res.data;
            }
          } catch (err: any) {
            // A 404 error from loggedinuser indicates the user is not in the DB yet, which is expected for new sign-ups.
            if (err.response?.status !== 404) {
              throw err;
            }
          }

          if (ud) {
            if (ud.isActive === false) {
              setUser(null);
              localStorage.removeItem("twitter-user");
              localStorage.removeItem("twitter-session-id");
              await signOut(auth);
            } else {
              setUser(ud);
              localStorage.setItem("twitter-user", JSON.stringify(ud));
              if (ud.sessionId) {
                localStorage.setItem("twitter-session-id", ud.sessionId);
              }
            }
          } else {
            const reg = await axiosInstance.post("/register", {
              username: fbUser.email.split("@")[0],
              displayName: fbUser.displayName || "User",
              avatar: fbUser.photoURL || DEFAULT_AVATAR,
              email: fbUser.email,
            });
            if (reg.data?._id) {
              setUser(reg.data);
              localStorage.setItem("twitter-user", JSON.stringify(reg.data));
              if (reg.data.sessionId) {
                localStorage.setItem("twitter-session-id", reg.data.sessionId);
              }
            } else {
              setUser(null);
              localStorage.removeItem("twitter-user");
              localStorage.removeItem("twitter-session-id");
            }
          }
        } catch (err) {
          console.error("Auth state observer error:", err);
          setUser(null);
          localStorage.removeItem("twitter-user");
          localStorage.removeItem("twitter-session-id");
        }
      } else {
        // Persist local credentials/phone session across refreshes
        const stored = localStorage.getItem("twitter-user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?._id) {
              if (parsed.isActive === false) {
                setUser(null);
                localStorage.removeItem("twitter-user");
                localStorage.removeItem("twitter-session-id");
              } else {
                setUser(parsed);
                if (localStorage.getItem("logout-pending") === "true") {
                   setUser(null);
                   return;
                }
                // Background verify session
                axiosInstance.get("/loggedinuser", { params: { email: parsed.email } })
                  .then(res => {
                    if (res.data?._id) {
                      setUser(res.data);
                      localStorage.setItem("twitter-user", JSON.stringify(res.data));
                      if (res.data.sessionId) {
                        localStorage.setItem("twitter-session-id", res.data.sessionId);
                      }
                    }
                  })
                  .catch(err => {
                    if (err.response?.status === 401 || err.response?.data?.error === "SESSION_REVOKED") {
                      logout();
                    }
                  });
              }
            } else {
              setUser(null);
              localStorage.removeItem("twitter-user");
              localStorage.removeItem("twitter-session-id");
            }
          } catch {
            setUser(null);
            localStorage.removeItem("twitter-user");
            localStorage.removeItem("twitter-session-id");
          }
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const refreshUser = async () => {
    if (localStorage.getItem("logout-pending") === "true") return;
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get("/loggedinuser", { params: { email: user.email } });
      if (res.data?._id) {
        if (res.data.isActive === false) {
          logout();
          return;
        }
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      }
    } catch { /* ignore */ }
  };

  const login = async (email: string, password: string) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/login", { email, password });
      if (res.data?.requireOTP) {
        return res.data; // Return the OTP requirement flag
      }
      if (res.data?._id) {
        if (res.data.isActive === false) throw new Error("Account is deactivated.");
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
        if (res.data.sessionId) {
          localStorage.setItem("twitter-session-id", res.data.sessionId);
        }
      } else throw new Error("Login failed");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      throw new Error(msg || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhone = async (phone: string, password: string, phoneVerified: boolean = false) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/login/phone", { phone, password, phoneVerified });
      if (res.data?.requireOTP) {
        return res.data; // Return the OTP requirement flag
      }
      if (res.data?._id) {
        if (res.data.isActive === false) throw new Error("Account is deactivated.");
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
        if (res.data.sessionId) {
          localStorage.setItem("twitter-session-id", res.data.sessionId);
        }
      } else throw new Error("Login failed");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      throw new Error(msg || "Phone login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, username: string, displayName: string) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/register", {
        email,
        password,
        username,
        displayName,
      });
      if (res.data?._id) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
        if (res.data.sessionId) {
          localStorage.setItem("twitter-session-id", res.data.sessionId);
        }
      } else throw new Error("Registration failed");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      throw new Error(msg || "Email registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithPhone = async (phone: string, password: string, username: string, displayName: string, phoneVerified: boolean = false) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/register/phone", { phone, password, username, displayName, phoneVerified });
      if (res.data?._id) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
        if (res.data.sessionId) {
          localStorage.setItem("twitter-session-id", res.data.sessionId);
        }
      } else throw new Error("Registration failed");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      throw new Error(msg || "Phone registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (localStorage.getItem("logout-pending") === "true") {
      return;
    }
    localStorage.setItem("logout-pending", "true");
    try {
      const sessionId = localStorage.getItem("twitter-session-id");
      const storedUser = localStorage.getItem("twitter-user");
      let userId = null;
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          userId = parsed?._id;
        } catch { /* ignore */ }
      }
      await axiosInstance.post("/logout", { sessionId, userId });
    } catch (err) {
      console.warn("Backend logout request failed:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("twitter-user");
      localStorage.removeItem("twitter-session-id");
      try {
        await signOut(auth);
      } catch {
        /* phone users have no Firebase session */
      }
      window.location.href = "/";
    }
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    coverImage?: string;
  }) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.patch(`/userupdate/${encodeEmailPath(user.email)}`, profileData);
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    } catch {
      throw new Error("Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (newData: Partial<User>) => {
    if (localStorage.getItem("logout-pending") === "true") return;
    if (!user) return;
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem("twitter-user", JSON.stringify(updated));
  };

  const setUserPassword = async (newPassword: string, currentPassword?: string) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    if (!user) throw new Error("Not logged in");
    const res = await axiosInstance.patch(`/user/${encodeEmailPath(user.email)}/password`, { newPassword, currentPassword });
    if (res.data?.user) {
      const updated = { ...user, lastPasswordChange: res.data.user.lastPasswordChange };
      setUser(updated);
      localStorage.setItem("twitter-user", JSON.stringify(updated));
    }
  };

  const verifyUserPassword = async (password: string): Promise<boolean> => {
    if (localStorage.getItem("logout-pending") === "true") return false;
    if (!user) return false;
    try {
      const res = await axiosInstance.post("/user/verify-password", { email: user.email, password });
      return res.data?.valid === true;
    } catch {
      return false;
    }
  };

  const googlesignin = async () => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      if (!fbUser?.email) throw new Error("No email in Google account");
      
      let ud = null;
      try {
        const res = await axiosInstance.get("/loggedinuser", { params: { email: fbUser.email } });
        if (res.data?._id) {
          ud = res.data;
        }
      } catch (err: any) {
        // A 404 indicates the user is not registered in the DB yet, proceed to registration
        if (err.response?.status !== 404) {
          throw err;
        }
      }

      if (!ud) {
        const reg = await axiosInstance.post("/register", {
          username: fbUser.email.split("@")[0],
          displayName: fbUser.displayName || "User",
          avatar: fbUser.photoURL || DEFAULT_AVATAR,
          email: fbUser.email,
        });
        ud = reg.data;
      }
      
      if (ud?._id) {
        if (ud.isActive === false) throw new Error("Account is deactivated.");
        setUser(ud);
        localStorage.setItem("twitter-user", JSON.stringify(ud));
        if (ud.sessionId) {
          localStorage.setItem("twitter-session-id", ud.sessionId);
        }
      } else throw new Error("Login failed: no user data");
    } catch (err: unknown) {
      console.error("Google sign in exception:", err);
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        throw new Error(`Google Sign-In failed: ${fbErr(code) || getErrorMessage(err)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLoginOTP = async (email: string, otp: string) => {
    if (localStorage.getItem("logout-pending") === "true") {
      throw new Error("Logout is currently pending.");
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/login/verify-otp", { email, otp });
      if (res.data?._id) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
        if (res.data.sessionId) {
          localStorage.setItem("twitter-session-id", res.data.sessionId);
        }
      } else throw new Error("OTP Verification failed");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      throw new Error(msg || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCtx.Provider
      value={{ user, login, loginWithPhone, signup, signupWithPhone, updateProfile, updateUser, setUserPassword, verifyUserPassword, logout, isLoading, googlesignin, refreshUser, verifyLoginOTP }}
    >
      {children}
    </AuthCtx.Provider>
  );
};
