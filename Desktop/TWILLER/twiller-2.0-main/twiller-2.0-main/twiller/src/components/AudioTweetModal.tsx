"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mic, MicOff, Upload, CheckCircle2, Clock, AlertCircle, Play, Pause } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { mediaUrl } from "@/lib/backendUrl";
type OtpChannel = "email" | "mobile";

interface AudioTweetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTweetPosted: (tweet: any) => void;
}

type Step = "info" | "otp-request" | "otp-verify" | "record" | "compose" | "posting";
const MAX_AUDIO_SECONDS = 5 * 60;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

export default function AudioTweetModal({ isOpen, onClose, onTweetPosted }: AudioTweetModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("info");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [otp, setOtp] = useState("");
  const [uploadToken, setUploadToken] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<OtpChannel | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const durationRef = useRef(0);

  // Check if current time is within 2:00 PM – 7:00 PM IST (using Intl.DateTimeFormat for clock hardening)
  const isWithinTimeWindow = () => {
    try {
      const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(new Date());
      let hour = 0, minute = 0;
      for (const part of parts) {
        if (part.type === "hour") hour = parseInt(part.value, 10);
        if (part.type === "minute") minute = parseInt(part.value, 10);
      }
      const totalMins = hour * 60 + minute;
      return totalMins >= 14 * 60 && totalMins < 19 * 60; // 14:00 - 19:00 IST
    } catch {
      // Fallback
      const now = new Date();
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const totalMins = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
      return totalMins >= 14 * 60 && totalMins < 19 * 60;
    }
  };

  const readAudioDuration = (file: Blob): Promise<number> =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read audio duration."));
      };
      audio.src = objectUrl;
    });

  useEffect(() => {
    if (!isOpen) {
      setStep("info");
      setOtp("");
      setOtpError("");
      setAudioBlob(null);
      setAudioUrl("");
      setContent("");
      setDuration(0);
      durationRef.current = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpCountdown]);

  const requestOtp = async () => {
    if (!user?.email) return;
    setSelectedChannel("email");
    setIsRequestingOtp(true);
    setOtpError("");
    try {
      await axiosInstance.post("/audio/request-otp", {
        email: user.email,
        channel: "email"
      });
      setStep("otp-verify");
      setOtpCountdown(600); // 10 minutes
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to send OTP";
      setOtpError(msg);
      setStep("otp-request");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!user?.email || !otp.trim()) return;
    setOtpError("");
    try {
      const res = await axiosInstance.post("/audio/verify-otp", { email: user.email, otp: otp.trim() });
      setUploadToken(res.data.uploadToken);
      setStep("record");
    } catch (err: any) {
      setOtpError(err.response?.data?.error || "Invalid OTP");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordedDuration = durationRef.current;
        if (recordedDuration > MAX_AUDIO_SECONDS) {
          setError("Recording exceeds 5 minutes. Please record a shorter clip.");
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        setDuration(recordedDuration);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
        if (durationRef.current >= MAX_AUDIO_SECONDS) stopRecording();
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      setError("File exceeds 100 MB limit.");
      return;
    }
    try {
      const fileDuration = await readAudioDuration(file);
      if (fileDuration > MAX_AUDIO_SECONDS) {
        setError("Audio must be 5 minutes or shorter.");
        return;
      }
      setAudioBlob(null);
      setAudioFile(file);
      setDuration(Math.round(fileDuration));
      durationRef.current = Math.round(fileDuration);
      setAudioUrl(URL.createObjectURL(file));
      setError("");
    } catch (err: any) {
      setError(err.message || "Could not read audio file.");
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const proceedToCompose = () => {
    if (!audioBlob && !audioFile) {
      setError("Please record or upload an audio file first.");
      return;
    }
    setError("");
    setStep("compose");
  };

  const submitTweet = async () => {
    if (!user) return;
    setStep("posting");
    setError("");
    try {
      // Upload audio
      const formData = new FormData();
      const fileToUpload = audioFile || (audioBlob ? new File([audioBlob], "recording.webm", { type: "audio/webm" }) : null);
      if (!fileToUpload) { setError("No audio file found."); setStep("compose"); return; }

      formData.append("audio", fileToUpload);
      formData.append("uploadToken", uploadToken);
      formData.append("email", user.email);
      formData.append("durationSeconds", String(duration));

      const uploadRes = await axiosInstance.post("/audio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const audioServerUrl = uploadRes.data.audioUrl;

      // Post tweet
      const tweetRes = await axiosInstance.post("/post", {
        author: user._id,
        content: content.trim() || "Audio post",
        audio: audioServerUrl,
      });
      onTweetPosted(tweetRes.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to post audio tweet. Please try again.");
      setStep("compose");
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  const withinWindow = isWithinTimeWindow();

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#000000] border border-[#2f3336] rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336]">
            <button onClick={onClose} className="p-3 rounded-full hover:bg-white/10 transition-colors text-[#e7e9ea] min-w-[48px] min-h-[48px] flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-[#e7e9ea] font-bold text-lg">{t("Audio Tweet") || "Audio Tweet"}</h2>
            <div className="w-8" />
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* ── Step: Info ── */}
            {step === "info" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-[#1d9bf0]/10 rounded-2xl border border-[#1d9bf0]/20">
                  <Mic className="h-8 w-8 text-[#1d9bf0] flex-shrink-0" />
                  <div>
                    <p className="text-[#e7e9ea] font-bold">{t("Audio Tweet Feature") || "Audio Tweet Feature"}</p>
                    <p className="text-[#71767b] text-sm mt-0.5">{t("audio_tweet_desc") || "Share your voice with the world."}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-4 w-4 text-[#ffd400] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#e7e9ea] font-semibold">{t("Time Window") || "Time Window"}</p>
                      <p className="text-[#71767b]">{t("audio_window_desc") || "Audio uploads are only allowed between 2:00 PM – 7:00 PM IST"}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-4 w-4 text-[#ffd400] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#e7e9ea] font-semibold">{t("Limits") || "Limits"}</p>
                      <p className="text-[#71767b]">{t("audio_limits_desc") || "Max 5 minutes duration · Max 100 MB file size"}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-[#00ba7c] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#e7e9ea] font-semibold">{t("Authentication Required") || "Authentication Required"}</p>
                      <p className="text-[#71767b]">{t("otp_will_be_sent_to") || "An OTP will be sent to"} <strong className="text-[#e7e9ea]">{user?.email ? maskEmail(user.email) : t("your email")}</strong></p>
                    </div>
                  </div>
                </div>

                {!withinWindow && (
                  <div className="p-3 bg-[#f4212e]/10 border border-[#f4212e]/30 rounded-xl">
                    <p className="text-[#f4212e] text-sm font-semibold flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{t("audio_closed_desc") || "Audio uploads are currently closed. Come back between 2:00 PM – 7:00 PM IST."}</span>
                    </p>
                  </div>
                )}

                <button
                  onClick={() => { setStep("otp-request"); }}
                  disabled={!withinWindow}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-full py-3 transition-colors"
                >
                  {t("Continue with OTP") || "Continue with OTP"}
                </button>
              </div>
            )}

            {/* ── Step: Request OTP ── */}
            {step === "otp-request" && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mx-auto">
                  <Mic className="h-8 w-8 text-[#1d9bf0]" />
                </div>
                <div>
                  <p className="text-[#e7e9ea] font-bold text-lg">{t("verify_your_identity") || "Verify your identity"}</p>
                  <p className="text-[#71767b] text-sm mt-1">{t("verify_identity_desc") || "We'll send a 6-digit email OTP to verify your identity."}</p>
                </div>
                {otpError && <p className="text-[#f4212e] text-sm">{otpError}</p>}
                <button
                  onClick={() => requestOtp()}
                  disabled={isRequestingOtp}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-bold rounded-full py-3 transition-colors"
                >
                  {isRequestingOtp ? (t("sending_code") || "Sending OTP…") : (t("Send Verification Code") || "Send Verification Code")}
                </button>
              </div>
            )}

            {/* ── Step: Verify OTP ── */}
            {step === "otp-verify" && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[#e7e9ea] font-bold text-lg">{t("Enter OTP") || "Enter OTP"}</p>
                  <p className="text-[#71767b] text-sm mt-1 leading-relaxed">
                    {selectedChannel === "email" ? (
                      <>
                        {t("sent_email_code_to") || "We sent a 6-digit email OTP:"}{" "}
                        <strong className="text-[#e7e9ea]">{user?.email ? maskEmail(user.email) : t("your email")}</strong>
                      </>
                    ) : selectedChannel === "mobile" ? (
                      <>
                        {t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"}{" "}
                        <strong className="text-[#e7e9ea]">{user?.phone}</strong>
                      </>
                    ) : (
                      <>
                        {t("sent_email_code_to") || "We sent a 6-digit email OTP:"}{" "}
                        <strong className="text-[#e7e9ea]">{user?.email ? maskEmail(user.email) : t("your email")}</strong>{" "}
                        {t("and") || "and"}{" "}
                        {t("sent_sms_code_to") || "We sent a 6-digit WhatsApp OTP:"}{" "}
                        <strong className="text-[#e7e9ea]">{user?.phone}</strong>
                      </>
                    )}
                  </p>
                  {otpCountdown > 0 && (
                    <p className="text-[#71767b] text-xs mt-1">{t("code_expires_10m") || "Code expires in 10 minutes"} ({formatTime(otpCountdown)})</p>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] bg-[#16181c] border border-[#2f3336] focus:border-[#1d9bf0] rounded-xl py-4 text-[#e7e9ea] outline-none transition-colors"
                />
                {otpError && <p className="text-[#f4212e] text-sm text-center">{otpError}</p>}
                <button
                  onClick={verifyOtp}
                  disabled={otp.length !== 6}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-40 text-white font-bold rounded-full py-3 transition-colors"
                >
                  {t("Verify OTP") || "Verify OTP"}
                </button>
                <button
                  onClick={() => { setStep("otp-request"); setOtp(""); setOtpError(""); }}
                  className="w-full text-[#1d9bf0] hover:text-[#1a8cd8] text-sm font-semibold transition-colors py-1"
                >
                  {t("Didn't receive it? Resend") || "Didn't receive it? Resend"}
                </button>
              </div>
            )}

            {/* ── Step: Record / Upload ── */}
            {step === "record" && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[#e7e9ea] font-bold text-lg">{t("record_or_upload_audio") || "Record or Upload Audio"}</p>
                  <p className="text-[#71767b] text-sm mt-1">{t("audio_max_limits") || "Max 5 minutes · Max 100 MB"}</p>
                </div>

                {/* Recorder */}
                <div className="flex flex-col items-center space-y-3 p-5 bg-[#16181c] rounded-2xl border border-[#2f3336]">
                  {recording ? (
                    <>
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-[#f4212e]/20 flex items-center justify-center animate-pulse">
                          <Mic className="h-8 w-8 text-[#f4212e]" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#f4212e] rounded-full animate-ping" />
                      </div>
                      <p className="text-[#e7e9ea] font-mono text-2xl font-bold">{formatTime(duration)}</p>
                      <p className="text-[#71767b] text-sm">{t("recording_max") || "Recording… max 5:00"}</p>
                      <button
                        onClick={stopRecording}
                        className="bg-[#f4212e] hover:bg-[#cc1b28] text-white font-bold rounded-full px-8 py-2.5 transition-colors flex items-center space-x-2"
                      >
                        <MicOff className="h-4 w-4" />
                        <span>{t("stop_recording") || "Stop Recording"}</span>
                      </button>
                    </>
                  ) : audioUrl ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-[#202327] rounded-xl">
                        <button
                           onClick={togglePlayback}
                           className="w-12 h-12 rounded-full bg-[#1d9bf0] flex items-center justify-center flex-shrink-0"
                        >
                          {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-[#2f3336] rounded-full">
                            <div className="h-full bg-[#1d9bf0] rounded-full w-0 transition-all" style={{ width: isPlaying ? "100%" : "0%" }} />
                          </div>
                          <p className="text-[#71767b] text-xs mt-1">{formatTime(duration)} {t("recorded") || "recorded"}</p>
                        </div>
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <button
                        onClick={() => { setAudioBlob(null); setAudioUrl(""); setAudioFile(null); setDuration(0); }}
                        className="w-full text-[#f4212e] text-sm font-semibold hover:text-[#cc1b28] transition-colors"
                      >
                        {t("remove_re_record") || "Remove and re-record"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 border-2 border-[#1d9bf0] flex items-center justify-center hover:bg-[#1d9bf0]/20 transition-colors"
                    >
                      <Mic className="h-7 w-7 text-[#1d9bf0]" />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 h-px bg-[#2f3336]" />
                  <span className="text-[#71767b] text-xs">{t("or") || "or"}</span>
                  <div className="flex-1 h-px bg-[#2f3336]" />
                </div>

                {/* File upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 border border-[#536471] rounded-full py-2.5 text-[#e7e9ea] hover:bg-white/5 transition-colors font-semibold text-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span>{t("upload_audio_file") || "Upload audio file"}</span>
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

                {error && <p className="text-[#f4212e] text-sm text-center">{error}</p>}

                <button
                  onClick={proceedToCompose}
                  disabled={!audioUrl}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-40 text-white font-bold rounded-full py-3 transition-colors"
                >
                  {t("next") || "Next"}
                </button>
              </div>
            )}

            {/* ── Step: Compose ── */}
            {step === "compose" && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={mediaUrl(user?.avatar)} />
                    <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
                      {user?.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <textarea
                    placeholder={t("add_caption_audio_tweet") || "Add a caption to your audio tweet…"}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    maxLength={280}
                    className="flex-1 bg-transparent text-[#e7e9ea] text-lg placeholder-[#71767b] resize-none outline-none min-h-[80px] leading-relaxed"
                    style={{ caretColor: "#1d9bf0" }}
                  />
                </div>

                {/* Audio preview */}
                <div className="p-3 bg-[#16181c] rounded-xl border border-[#2f3336] flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[#1d9bf0]/20 flex items-center justify-center flex-shrink-0">
                    <Mic className="h-4 w-4 text-[#1d9bf0]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e7e9ea] text-sm font-semibold">{t("Audio Tweet") || "Audio Tweet"}</p>
                    <p className="text-[#71767b] text-xs">{formatTime(duration)} · {t("ready_to_post") || "Ready to post"}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[#00ba7c] flex-shrink-0" />
                </div>

                {error && <p className="text-[#f4212e] text-sm">{error}</p>}

                <button
                  onClick={submitTweet}
                  className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full py-3 transition-colors"
                >
                  {t("Post Audio Tweet") || "Post Audio Tweet"}
                </button>
              </div>
            )}

            {/* ── Step: Posting ── */}
            {step === "posting" && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-12 h-12 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#e7e9ea] font-semibold">{t("posting_audio_tweet") || "Posting your audio tweet…"}</p>
                <p className="text-[#71767b] text-sm">{t("uploading_publishing") || "Uploading audio and publishing"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.slice(0, 2) + "*".repeat(Math.max(0, local.length - 2));
  return `${masked}@${domain}`;
}
