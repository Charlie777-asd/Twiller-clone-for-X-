import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: null },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  paymentId: { type: String, default: null },
  orderId: { type: String, default: null },
  screenshot: { type: String, default: null },
  status: { type: String, enum: ["open", "in-progress", "resolved"], default: "open" },
  adminReply: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("SupportTicket", SupportTicketSchema);
