import mongoose from "mongoose";

const ConversationSchema = mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  lastMessage: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Conversation", ConversationSchema);
