import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  avatar: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: null, unique: true, sparse: true },
  passwordHash: { type: String, default: null },
  lastPasswordChange: { type: Date, default: null },
  bio: { type: String, default: "" },
  coverImage: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  notificationPrefs: {
    likes: { type: Boolean, default: true },
    retweets: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
  },
  privacySettings: {
    protectedTweets: { type: Boolean, default: false },
    dmFromAnyone: { type: Boolean, default: true },
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],
  interests: [{ type: String }],
  isBot: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  accessibilityPrefs: {
    reduceMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    colorBlindMode: { type: Boolean, default: false },
    autoplayGifs: { type: Boolean, default: true },
    autoplayVideos: { type: Boolean, default: true },
  },
  displayPrefs: {
    fontSize: { type: Number, default: 3 },
    colorAccent: { type: String, default: "#1d9bf0" },
    backgroundTheme: { type: String, default: "#000" },
  },
  blockedAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  mutedAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  subscription: {
    plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
    activatedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    orderId: { type: String, default: null },
  },
  lastPasswordResetDate: { type: String, default: null }, // stored as YYYY-MM-DD IST — rate-limits forgot-password to once per day
  dailyTweetCount: { type: Number, default: 0 },
  lastTweetDate: { type: String, default: null }, // stored as YYYY-MM-DD IST
  language: { type: String, default: "English" },
  otpCode: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    browser: { type: String },
    os: { type: String },
    deviceCategory: { type: String },
    ipAddress: { type: String }
  }],
  sessions: [{
    sessionId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    browser: { type: String },
    os: { type: String },
    deviceCategory: { type: String },
    ipAddress: { type: String },
    isActive: { type: Boolean, default: true }
  }],
});
UserSchema.pre("save", function (next) {
  if (this.subscription && this.subscription.plan === "free") {
    this.subscription.activatedAt = null;
    this.subscription.expiresAt = null;
    this.subscription.orderId = null;
  }
  next();
});


UserSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  // Check if updating the whole subscription object
  if (update.subscription && update.subscription.plan === "free") {
    update.subscription.activatedAt = null;
    update.subscription.expiresAt = null;
    update.subscription.orderId = null;
  }
  // Check if updating via dot notation ($set)
  if (update.$set) {
    if (update.$set["subscription.plan"] === "free") {
      update.$set["subscription.activatedAt"] = null;
      update.$set["subscription.expiresAt"] = null;
      update.$set["subscription.orderId"] = null;
    }
    if (update.$set.subscription && update.$set.subscription.plan === "free") {
      update.$set.subscription.activatedAt = null;
      update.$set.subscription.expiresAt = null;
      update.$set.subscription.orderId = null;
    }
  }
  next();
});

export default mongoose.model("User", UserSchema);

