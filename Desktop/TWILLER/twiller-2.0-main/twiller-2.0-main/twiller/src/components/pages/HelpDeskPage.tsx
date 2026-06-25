"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  HelpCircle, MessageSquare, Ticket, FileText, CheckCircle2, 
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Clock, 
  ArrowRight, User as UserIcon, Mail, Phone, Camera 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { buildBackendUrl } from "@/lib/backendUrl";
import LoadingSpinner from "../loading-spinner";

type Tab = "submit" | "tickets" | "faq";

interface SupportTicket {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
  paymentId: string;
  orderId: string;
  screenshot?: string;
  status: "open" | "in-progress" | "resolved";
  adminReply: string;
  createdAt: string;
}

export default function HelpDeskPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("submit");
  
  // Submit Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Plan Activation Failure");
  const [description, setDescription] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    if (!user?._id) return;
    setLoadingTickets(true);
    try {
      const res = await axiosInstance.get(`/helpdesk/tickets/${user._id}`);
      setTickets(res.data || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (activeTab === "tickets") {
      fetchTickets();
    } else if (activeTab === "submit") {
      setSubmitSuccess(false);
      setSubmitError("");
      setSubject("");
      setDescription("");
      setPaymentId("");
      setOrderId("");
      setScreenshot(null);
      setCategory("Plan Activation Failure");
    }
  }, [activeTab, fetchTickets]);

  // Form Submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !description.trim()) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("userId", user._id);
      formData.append("name", user.displayName);
      formData.append("email", user.email);
      if (user.phone) formData.append("phone", user.phone);
      formData.append("subject", `[${category}] ${subject}`);
      formData.append("description", description);
      if (paymentId.trim()) formData.append("paymentId", paymentId.trim());
      if (orderId.trim()) formData.append("orderId", orderId.trim());
      if (screenshot) formData.append("screenshot", screenshot);

      await axiosInstance.post("/helpdesk/tickets", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSubmitSuccess(true);
      setSubject("");
      setDescription("");
      setPaymentId("");
      setOrderId("");
      setScreenshot(null);
      
      // Auto switch to tickets tab after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab("tickets");
      }, 3000);

    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00ba7c]/10 text-[#00ba7c] border border-[#00ba7c]/30">
            {t("Resolved")}
          </span>
        );
      case "in-progress":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/30">
            {t("In Progress")}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            {t("Open") || "Open"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-16 md:top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="hidden md:flex text-xl font-extrabold text-[#e7e9ea] items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#1d9bf0]" />
            {t("help_desk_support")}
          </h1>
          {activeTab === "tickets" && (
            <button
              onClick={fetchTickets}
              disabled={loadingTickets}
              className="p-2 rounded-full hover:bg-white/5 text-[#71767b] hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loadingTickets ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2f3336] flex">
        <button
          onClick={() => setActiveTab("submit")}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all ${
            activeTab === "submit"
              ? "border-[#1d9bf0] text-white"
              : "border-transparent text-[#71767b] hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <MessageSquare size={16} /> {t("submit_ticket")}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all ${
            activeTab === "tickets"
              ? "border-[#1d9bf0] text-white"
              : "border-transparent text-[#71767b] hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Ticket size={16} /> {t("my_tickets")}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all ${
            activeTab === "faq"
              ? "border-[#1d9bf0] text-white"
              : "border-transparent text-[#71767b] hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <FileText size={16} /> {t("support_faqs")}
          </span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div key={activeTab} className="animate-page-fade">
          {/* TAB 1: SUBMIT TICKET FORM */}
          {activeTab === "submit" && (
          <div className="space-y-6">
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
              <h2 className="text-[#e7e9ea] font-extrabold text-lg mb-1 flex items-center gap-2">
                🔒 {t("premium_support_portal")}
              </h2>
              <p className="text-[#71767b] text-xs leading-relaxed">
                {t("Having issues with your premium activation or billing? Submit a ticket below. Our automated system tracks transaction logs to activate plans.")}
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-lg">{t("ticket_submitted_success")}</h3>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    {t("ticket_submitted_desc")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-[#1d9bf0] font-bold">
                  <span>{t("redirecting_tickets")}</span>
                  <ArrowRight size={12} className="animate-pulse" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                {submitError && (
                  <div className="flex items-start gap-3 p-4 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-2xl">
                    <AlertTriangle size={16} className="text-[#f4212e] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#f4212e] font-bold text-sm">{t("submission_error")}</p>
                      <p className="text-[#f4212e]/80 text-xs mt-0.5">{submitError}</p>
                    </div>
                  </div>
                )}

                {/* Pre-filled Account Card */}
                <div className="bg-[#0c0d0e] border border-[#2f3336] p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#71767b]">
                    <UserIcon size={14} className="text-[#1d9bf0]" />
                    <span className="truncate">{t("Name")}: <strong className="text-white">{user?.displayName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[#71767b]">
                    <Mail size={14} className="text-[#1d9bf0]" />
                    <span className="truncate">{t("Email")}: <strong className="text-white">{user?.email?.includes("@phone.twiller.local") ? t("Linked via Phone") : user?.email}</strong></span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-2 text-[#71767b] md:col-span-2">
                      <Phone size={14} className="text-[#1d9bf0]" />
                      <span>{t("WhatsApp Phone")}: <strong className="text-white">{user.phone}</strong></span>
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#71767b]">{t("Issue Category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-[#1d9bf0]"
                  >
                    <option value="Plan Activation Failure">{t("Plan Activation Delay / Failure")}</option>
                    <option value="Double Billed">{t("Double Charged")}</option>
                    <option value="Payment Gateway Issue">{t("Payment checkout error")}</option>
                    <option value="WhatsApp OTP Issue">{t("OTP not received via WhatsApp")}</option>
                    <option value="Other Support Query">{t("Other Payment / Verification Query")}</option>
                  </select>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#71767b]">{t("Short Subject")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Completed payment but Gold Plan is not active"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-[#1d9bf0] placeholder:text-[#536471]"
                  />
                </div>

                {/* Optional payment info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#71767b] flex items-center gap-1.5">
                      {t("Payment ID")} <span className="text-[10px] text-[#536471]">{t("(Optional)")}</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6BG03444Y573..."
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                      className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-[#1d9bf0] placeholder:text-[#536471] font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#71767b] flex items-center gap-1.5">
                      {t("Twiller Order ID")} <span className="text-[10px] text-[#536471]">{t("(Optional)")}</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. mock_order_..."
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-[#1d9bf0] placeholder:text-[#536471] font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#71767b]">{t("Describe the issue")}</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Provide detailed description of your transaction or inquiry..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-[#1d9bf0] placeholder:text-[#536471] resize-none"
                  />
                </div>

                {/* Screenshot Upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#71767b]">{t("Attach Screenshot (Optional)")}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      id="screenshot-file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setScreenshot(file);
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="screenshot-file"
                      className="flex items-center gap-2 px-4 py-2 border border-[#2f3336] rounded-xl hover:bg-white/5 text-[#e7e9ea] text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Camera size={14} className="text-[#1d9bf0]" />
                      {screenshot ? t("Change Image") : t("Upload Image")}
                    </label>
                    {screenshot && (
                      <div className="flex items-center gap-2 bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 rounded-xl px-3 py-1.5 text-xs text-[#1d9bf0]">
                        <span className="max-w-[150px] truncate">{screenshot.name}</span>
                        <button
                          type="button"
                          onClick={() => setScreenshot(null)}
                          className="hover:text-white font-bold ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white font-extrabold py-3.5 rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" /> {t("submitting_ticket")}
                    </>
                  ) : (
                    t("Submit Secure Support Ticket")
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: MY TICKETS STATUS TRACKER */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {loadingTickets && tickets.length === 0 ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="md" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 border border-[#2f3336] rounded-2xl bg-[#16181c]/30 space-y-3">
                <Ticket size={36} className="text-[#71767b] mx-auto" />
                <h3 className="text-white font-extrabold text-sm">{t("No Tickets Found")}</h3>
                <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                  {t("no_tickets_desc")}
                </p>
                <button
                  onClick={() => setActiveTab("submit")}
                  className="px-4 py-2 bg-[#1d9bf0] text-black font-extrabold rounded-full text-xs hover:bg-[#1a8cd8]"
                >
                  {t("Create Ticket")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const isExpanded = expandedTicket === ticket._id;
                  const formattedId = ticket._id.slice(-6).toUpperCase();
                  const dateLabel = new Date(ticket.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

                  return (
                    <div 
                      key={ticket._id} 
                      className={`border rounded-xl transition-all ${
                        isExpanded ? "border-[#1d9bf0] bg-[#16181c]" : "border-[#2f3336] bg-[#16181c]/40 hover:bg-[#16181c]/70"
                      }`}
                    >
                      {/* Ticket Summary Accordion Header */}
                      <div 
                        onClick={() => setExpandedTicket(isExpanded ? null : ticket._id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#1d9bf0]">#{formattedId}</span>
                            {getStatusBadge(ticket.status)}
                            <span className="text-[10px] text-[#71767b] flex items-center gap-1">
                              <Clock size={10} /> {dateLabel}
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-sm truncate">{ticket.subject}</h3>
                        </div>
                        <div>
                          {isExpanded ? <ChevronUp size={16} className="text-[#71767b]" /> : <ChevronDown size={16} className="text-[#71767b]" />}
                        </div>
                      </div>

                      {/* Ticket Details Expanded */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-[#2f3336] space-y-4 text-sm animate-in fade-in duration-200">
                          {/* Transaction Session Details */}
                          {(ticket.paymentId || ticket.orderId) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-lg border border-[#2f3336]/60 text-xs font-mono">
                              {ticket.paymentId && (
                                <div className="text-[#71767b]">
                                  Payment ID: <span className="text-white select-all">{ticket.paymentId}</span>
                                </div>
                              )}
                              {ticket.orderId && (
                                <div className="text-[#71767b]">
                                  Order ID: <span className="text-white select-all">{ticket.orderId}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Customer description */}
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#71767b] uppercase font-bold tracking-wider">{t("Ticket Description")}</p>
                            <p className="text-[#e7e9ea] leading-relaxed whitespace-pre-line text-xs bg-black/25 p-3 rounded-lg border border-[#2f3336]/30">
                              {ticket.description}
                            </p>
                          </div>

                          {/* Screenshot display */}
                          {ticket.screenshot && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-[#71767b] uppercase font-bold tracking-wider">{t("Attachment")}</p>
                              <div className="max-w-md border border-[#2f3336] rounded-lg overflow-hidden bg-black/60">
                                {/* Uploaded screenshots come from the backend uploads folder and are not suitable for Next image optimization. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={buildBackendUrl(ticket.screenshot)}
                                  alt="Ticket Screenshot"
                                  className="w-full h-auto max-h-[300px] object-contain cursor-zoom-in"
                                  onClick={() => window.open(buildBackendUrl(ticket.screenshot), "_blank")}
                                />
                              </div>
                            </div>
                          )}

                          {/* Admin reply status */}
                          {ticket.adminReply ? (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-[#00ba7c] uppercase font-bold tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={10} /> {t("Support Desk Response")}
                              </p>
                              <div className="bg-[#00ba7c]/5 border border-[#00ba7c]/20 p-3.5 rounded-lg text-xs leading-relaxed text-[#e7e9ea] relative">
                                <p className="whitespace-pre-line">{ticket.adminReply}</p>
                                <div className="text-[10px] text-[#71767b] mt-3 font-semibold">
                                  {t("Resolved by Support Administrator")}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-[#71767b]">
                              <Clock size={12} className="text-amber-500 animate-pulse" />
                              <span>{t("Tracing transaction logs. Automated admin response will publish shortly...")}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FAQ MODULE */}
        {activeTab === "faq" && (
          <div className="space-y-4">
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5 mb-2">
              <h2 className="text-[#e7e9ea] font-extrabold text-base mb-1">💳 {t("Billing & Payment Support")}</h2>
              <p className="text-[#71767b] text-xs leading-relaxed">
                {t("faq_tab_desc")}
              </p>
            </div>

            {[
              {
                q: "I completed payment but my account is still free. Why?",
                a: "Typically, subscription activation is instant. When the payment completes, your account should be upgraded automatically via webhooks. If it failed, submit a Support Ticket with your Payment ID, and our automated trace will activate it for you."
              },
              {
                q: "What payment window restrictions are enforced?",
                a: "To ensure real-time sandbox clearing, payments are accepted daily between 10:00 AM – 11:00 AM IST. If you submit a checkout request outside this window, it will cancel. Check the live countdown on the Premium plans page for opening hours."
              },
              {
                q: "How can I cancel my active subscription?",
                a: "Twiller subscriptions auto-renew monthly. To prevent future charges, you can request a cancellation at any time. Simply submit a Support Ticket with your Plan Details and Order ID. We will cancel the billing agreement, and you will retain premium benefits until the end of your billing cycle."
              },
              {
                q: "Can I have multiple plans active simultaneously?",
                a: "No. To avoid unauthorized double-billing, the system strictly blocks initiating a new plan purchase if you already have an active premium plan that hasn't expired. You must wait until your current plan duration ends."
              },
              {
                q: "How does the Sandbox testing simulator work?",
                a: "In test mode, you can checkout using test UPI IDs or test card details provided by Razorpay. The emulator acts exactly like a real bank capture, generating an identical secure receipt that registers with our servers."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#16181c] border border-[#2f3336] rounded-xl overflow-hidden transition-all duration-200"
                >
                  <div 
                    onClick={() => toggleFaq(idx)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/5"
                  >
                    <h3 className="text-white font-bold text-sm">{t(faq.q)}</h3>
                    {isOpen ? <ChevronUp size={16} className="text-[#71767b]" /> : <ChevronDown size={16} className="text-[#71767b]" />}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#2f3336] text-xs text-[#71767b] leading-relaxed animate-in fade-in duration-200">
                      {t(faq.a)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
