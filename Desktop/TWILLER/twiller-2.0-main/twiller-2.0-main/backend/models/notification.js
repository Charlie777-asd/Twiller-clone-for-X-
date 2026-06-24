import mongoose from "mongoose";

const NotificationSchema = mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["like", "follow", "retweet", "mention", "interest", "post", "message"], required: true },
  tweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet" },
  content: { type: String, default: "" },
  extra: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", NotificationSchema);
