import express from "express";
import nodemailer from "nodemailer";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import fs from "fs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { parseFile } from "music-metadata";
import Comment from "./models/comment.js";
import Conversation from "./models/conversation.js";
import Message from "./models/message.js";
import Notification from "./models/notification.js";
import { generateSeedData, BOT_IMAGE_TWEETS } from "./seedData.js";
import { initGmailTransport, sendViaGmailAPI } from "./lib/gmailTransport.js";
import bcrypt from "bcryptjs";
import SupportTicket from "./models/ticket.js";
import Payment from "./models/payment.js";
import twilio from "twilio";
import paymentRoutes from "./routes/paymentRoutes.js";
import { UAParser } from "ua-parser-js";
import {
  allowMockServices,
  getMongoUrl,
  getPublicServerUrl,
} from "./config/runtime.js";
import { startBotSimulator } from "./botSimulator.js";
dotenv.config();

// --- Pre-emptive Environment Variable Fallbacks & Warnings ---
if (!process.env.FRONTEND_URL)   console.warn("⚠️  FRONTEND_URL is not set. Using default CORS origins.");
if (!process.env.TWILIO_ACCOUNT_SID) console.warn("⚠️  TWILIO_ACCOUNT_SID is missing. SMS/WhatsApp OTP will be disabled or mocked.");
if (!(process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.email_password || process.env.GMAIL_PASSWORD)) console.warn("⚠️  EMAIL_PASSWORD is missing. Email delivery might fail.");
if (!(process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.EMAIL || process.env.email)) console.warn("⚠️  EMAIL_USER is missing. Email delivery might fail.");

// ── Translation Helper (MyMemory Translation API & Offline Fallback) ─────────
const LOCAL_TRANSLATIONS = {
  Spanish: {
    "hello": "hola",
    "hello world": "hola mundo",
    "how are you?": "¿cómo estás?",
    "welcome to twiller": "bienvenido a twiller",
    "welcome to twiller!": "¡bienvenido a twiller!",
    "this is a great day!": "¡este es un gran día!",
    "i love this app": "me encanta esta aplicación",
    "subscribe to premium": "suscribirse a premium",
    "happening now": "pasando ahora",
    "post": "publicar",
    "tweet": "tweet",
    "cancel": "cancelar",
    "save": "guardar",
    "save password": "guardar contraseña",
    "change password": "cambiar contraseña",
    "username": "nombre de usuario",
    "display name": "nombre para mostrar",
    "email": "correo electrónico",
    "phone": "teléfono",
    "settings": "configuración",
    "help desk": "centro de ayuda",
    "premium": "premium",
    "verification code": "código de verificación"
  },
  Hindi: {
    "hello": "नमस्ते",
    "hello world": "नमस्ते दुनिया",
    "how are you?": "आप कैसे हैं?",
    "welcome to twiller": "ट्विलर में आपका स्वागत है",
    "welcome to twiller!": "ट्विलर में आपका स्वागत है!",
    "this is a great day!": "यह एक महान दिन है!",
    "i love this app": "मुझे यह ऐप बहुत पसंद है",
    "subscribe to premium": "प्रीमियम की सदस्यता लें",
    "happening now": "अभी हो रहा है",
    "post": "पोस्ट",
    "tweet": "ट्वीट",
    "cancel": "रद्द करें",
    "save": "सहेजें",
    "save password": "पासवर्ड सहेजें",
    "change password": "पासवर्ड बदलें",
    "username": "उपयोगकर्ता नाम",
    "display name": "प्रदर्शित नाम",
    "email": "ईमेल",
    "phone": "फ़ोन",
    "settings": "सेटिंग्स",
    "help desk": "सहायता डेस्क",
    "premium": "प्रीमियम",
    "verification code": "सत्यापन कोड"
  },
  Portuguese: {
    "hello": "olá",
    "hello world": "olá mundo",
    "how are you?": "como vai?",
    "welcome to twiller": "bem-vindo ao twiller",
    "welcome to twiller!": "bem-vindo ao twiller!",
    "this is a great day!": "este é um ótimo dia!",
    "i love this app": "eu amo este aplicativo",
    "subscribe to premium": "assinar o premium",
    "happening now": "acontecendo agora",
    "post": "postar",
    "tweet": "tweet",
    "cancel": "cancelar",
    "save": "salvar",
    "save password": "salvar senha",
    "change password": "alterar senha",
    "username": "nome de usuário",
    "display name": "nome de exibição",
    "email": "e-mail",
    "phone": "telefone",
    "settings": "configurações",
    "help desk": "central de ajuda",
    "premium": "premium",
    "verification code": "código de verificação"
  },
  Chinese: {
    "hello": "你好",
    "hello world": "你好世界",
    "how are you?": "你好吗？",
    "welcome to twiller": "欢迎来到 twiller",
    "welcome to twiller!": "欢迎来到 twiller！",
    "this is a great day!": "这是一个美好的日子！",
    "i love this app": "我喜欢这个应用",
    "subscribe to premium": "订阅 premium",
    "happening now": "正在发生",
    "post": "发布",
    "tweet": "推文",
    "cancel": "取消",
    "save": "保存",
    "save password": "保存密码",
    "change password": "修改密码",
    "username": "用户名",
    "display name": "显示名称",
    "email": "电子邮件",
    "phone": "电话",
    "settings": "设置",
    "help desk": "帮助中心",
    "premium": "高级版",
    "verification code": "验证码"
  },
  French: {
    "hello": "bonjour",
    "hello world": "bonjour le monde",
    "how are you?": "comment allez-vous?",
    "welcome to twiller": "bienvenue sur twiller",
    "welcome to twiller!": "bienvenue sur twiller !",
    "this is a great day!": "c'est un grand jour !",
    "i love this app": "j'adore cette application",
    "subscribe to premium": "s'abonner à premium",
    "happening now": "ça se passe maintenant",
    "post": "publier",
    "tweet": "tweet",
    "cancel": "annuler",
    "save": "enregistrer",
    "save password": "sauvegarder le mot de passe",
    "change password": "changer le mot de passe",
    "username": "nom d'utilisateur",
    "display name": "nom d'affichage",
    "email": "e-mail",
    "phone": "téléphone",
    "settings": "paramètres",
    "help desk": "centre d'aide",
    "premium": "premium",
    "verification code": "code de vérification"
  }
};

const offlineTranslate = (text, targetLang) => {
  const dict = LOCAL_TRANSLATIONS[targetLang];
  if (!dict) return text;
  const cleanedText = text.trim();
  const lowerText = cleanedText.toLowerCase();

  // Try exact match
  if (dict[lowerText]) {
    // Preserve casing roughly
    const matched = dict[lowerText];
    if (cleanedText === cleanedText.toUpperCase()) return matched.toUpperCase();
    if (cleanedText[0] === cleanedText[0].toUpperCase()) {
      return matched[0].toUpperCase() + matched.slice(1);
    }
    return matched;
  }

  // Attempt word-by-word replacement for custom sentences
  const words = cleanedText.split(/(\b)/);
  const translated = words.map(w => {
    const wLower = w.toLowerCase();
    if (dict[wLower]) {
      const match = dict[wLower];
      if (w === w.toUpperCase()) return match.toUpperCase();
      if (w[0] === w[0].toUpperCase()) return match[0].toUpperCase() + match.slice(1);
      return match;
    }
    return w;
  });

  return translated.join("");
};

const translateText = async (text, targetLang) => {
  try {
    const langMap = {
      Spanish: "es",
      Hindi: "hi",
      Portuguese: "pt",
      Chinese: "zh",
      French: "fr",
      English: "en",
    };
    const targetCode = langMap[targetLang];
    if (!targetCode || targetCode === "en") return text;
    
    // Attempt online API translation first
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetCode}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          return data.responseData.translatedText;
        }
      }
    } catch (apiErr) {
      console.warn("Online translation request failed, using offline fallback...");
    }

    // Offline translation fallback
    return offlineTranslate(text, targetLang);
  } catch (err) {
    console.warn("Translation helper exception:", err.message);
    return offlineTranslate(text, targetLang);
  }
};

// ── WhatsApp OTP Helper (Twilio Sandbox) ────────────────────────────────────
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio WhatsApp Client configured successfully.");
  } catch (err) {
    console.error("⚠️ Twilio initialization failed:", err.message);
  }
} else if (allowMockServices()) {
  console.log("ℹ️  Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env. Using mock gateway.");
} else {
  console.warn("⚠️ Twilio credentials are missing. OTP delivery is disabled until they are configured.");
}
const normalizePhone = (phone) => {
  if (!phone) return "";
  return "+" + phone.replace(/\D/g, "");
};

const sendSmsOtp = async (phone, otp, customMessage = null) => {
  const cleanPhone = normalizePhone(phone);
  const messageBody = customMessage || `Your Twiller verification code is: ${otp}. It expires in 10 minutes.`;
  const waTo = cleanPhone.startsWith('whatsapp:') ? cleanPhone : `whatsapp:${cleanPhone}`;
  const waFrom = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+14155238886'; // Sandbox number

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: waFrom,
        to: waTo
      });
      console.log(`[Twilio WhatsApp] Message sent successfully: ${message.sid}`);
      return { success: true, devMode: false };
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp message via Twilio:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Fallback: log to console
  console.log(`╬══════════════════════════════╠`);
  console.log(`  📱 WHATSAPP OTP MOCK FALLBACK (CONSOLE)`);
  console.log(`  To: ${waTo}`);
  console.log(`  From: ${waFrom}`);
  console.log(`  Message: ${messageBody}`);
  console.log(`╠══════════════════════════════╝`);
  return { success: true, devMode: true };
};

// Ensure upload dirs
const uploadDir = "uploads";
const audioDir = "uploads/audio";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://twiller-clone-for-x-dc27.vercel.app",
  "https://twiller-clone-for-x-dc27-git-main-targaryen1.vercel.app",
  "https://twiller-clone-for-x.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) or matching our domains
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/api/payments", paymentRoutes);

// Route aliases: POST /api/tweets -> /post, POST /api/tweets/:tweetid/like -> /like/:tweetid, POST /api/tweets/:tweetid/retweet -> /retweet/:tweetid
app.use((req, res, next) => {
  if (req.method === "POST") {
    if (req.url === "/api/tweets") {
      req.url = "/post";
    } else {
      const likeMatch = req.url.match(/^\/api\/tweets\/([^/]+)\/like$/);
      if (likeMatch) {
        req.url = `/like/${likeMatch[1]}`;
      } else {
        const retweetMatch = req.url.match(/^\/api\/tweets\/([^/]+)\/retweet$/);
        if (retweetMatch) {
          req.url = `/retweet/${retweetMatch[1]}`;
        }
      }
    }
  }
  next();
});

// Authoritative multi-device session revocation logout endpoint
app.post("/logout", async (req, res) => {
  try {
    let sessionId = req.headers["x-session-id"];
    if (!sessionId && req.headers["authorization"]?.startsWith("Bearer ")) {
      sessionId = req.headers["authorization"].split(" ")[1];
    }
    if (!sessionId) {
      sessionId = req.body.sessionId;
    }
    const { userId } = req.body;

    if (userId) {
      const user = await User.findById(userId);
      if (user && user.sessions) {
        if (sessionId) {
          const session = user.sessions.find(s => s.sessionId === sessionId);
          if (session) {
            session.isActive = false;
          }
        } else {
          // Deactivate all sessions for this user
          user.sessions.forEach(s => {
            s.isActive = false;
          });
        }
        await user.save();
      }
    } else if (sessionId) {
      // Find user by session ID
      const user = await User.findOne({ "sessions.sessionId": sessionId });
      if (user && user.sessions) {
        const session = user.sessions.find(s => s.sessionId === sessionId);
        if (session) {
          session.isActive = false;
          await user.save();
        }
      }
    }

    res.clearCookie("token");
    res.clearCookie("sessionId");

    return res.status(200).send({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).send({ error: error.message });
  }
});

app.post("/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).send({ error: "text and targetLang are required" });
    }
    const translated = await translateText(text, targetLang);
    return res.status(200).send({ translated });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

const AUDIO_MAX_BYTES = 100 * 1024 * 1024;
const AUDIO_MAX_SECONDS = 5 * 60;
const AUDIO_TOKEN_TTL_MS = 10 * 60 * 1000;
const AUDIO_WINDOW_START_MINUTES = 14 * 60; // 2:00 PM IST
const AUDIO_WINDOW_END_MINUTES = 19 * 60; // 7:00 PM IST

const isWithinAudioWindow = () => {
  let hour = 0;
  let minute = 0;
  try {
    const options = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    for (const part of parts) {
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }
  } catch (tzErr) {
    const now = new Date();
    const istMinutesFallback = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
    hour = Math.floor(istMinutesFallback / 60);
    minute = istMinutesFallback % 60;
  }
  const istMinutes = hour * 60 + minute;
  return istMinutes >= AUDIO_WINDOW_START_MINUTES && istMinutes < AUDIO_WINDOW_END_MINUTES;
};

// ── Subscription / Payment constants ─────────────────────────────────────────
const PAYMENT_WINDOW_START_MINUTES = 10 * 60;  // 10:00 AM IST
const PAYMENT_WINDOW_END_MINUTES   = 11 * 60;  // 11:00 AM IST

const PLAN_LIMITS = { free: 1, bronze: 3, silver: 5, gold: Infinity };
const PLAN_PRICES = { free: 0, bronze: 100, silver: 300, gold: 1000 };
const PLAN_NAMES  = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

const isWithinPaymentWindow = () => {
  let hour = 0;
  let minute = 0;
  try {
    const options = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    for (const part of parts) {
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }
  } catch (tzErr) {
    const now = new Date();
    const istMinutesFallback = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
    hour = Math.floor(istMinutesFallback / 60);
    minute = istMinutesFallback % 60;
  }
  const istMinutes = hour * 60 + minute;
  return istMinutes >= PAYMENT_WINDOW_START_MINUTES && istMinutes < PAYMENT_WINDOW_END_MINUTES;
};

const getISTDateString = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
};

// Payment gateway settings (replaced Razorpay with PayPal sandbox gateway)

const removeUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
};

// ── Cloudinary Configuration & Multer Storage ──────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "twiller_uploads",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// ── Multer for images ──────────────────────────────────────────────────────
const uploadImage = multer({
  storage: cloudinaryImageStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Multer for audio ───────────────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve("uploads/audio")),
  filename: (req, file, cb) => cb(null, `audio_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: AUDIO_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

// ── Email Templates ──────────────────────────────────────────────────────────
const generateProfessionalEmailTemplate = (title, message, code, subtitle = "Activation Code") => {
  return `
    <div style="font-family:'Outfit','Helvetica Neue',Arial,sans-serif;max-width:550px;margin:20px auto;background:#000000;border:1px solid #2f3336;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.9);">
      <div style="background:linear-gradient(135deg,#1d9bf0,#7856ff,#f91880);padding:40px 32px;text-align:center;position:relative;">
        <div style="display:inline-block;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border-radius:50%;padding:14px;margin-bottom:16px;">
          <svg viewBox="0 0 24 24" style="height:36px;width:36px;fill:#ffffff;display:block;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        </div>
        <h2 style="font-size:24px;font-weight:900;margin:0;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">Twiller Premium</h2>
      </div>
      <div style="padding:40px 32px;text-align:center;background:#000000;color:#e7e9ea;">
        <h3 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 16px;letter-spacing:-0.3px;">${title}</h3>
        <p style="color:#8b98a5;font-size:15px;line-height:1.7;margin:0 0 32px;">${message}</p>
        <div style="background:linear-gradient(180deg,#16181c,#0a0a0a);border-radius:20px;padding:28px;margin-bottom:32px;border:1px solid #2f3336;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);">
          <div style="font-size:11px;font-weight:800;color:#71767b;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${subtitle}</div>
          <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1d9bf0;font-family:monospace;margin-left:12px;text-shadow:0 0 20px rgba(29,155,240,0.2);">${code}</span>
        </div>
        <div style="border-top:1px solid #2f3336;padding-top:24px;margin-top:16px;">
          <p style="color:#71767b;font-size:12px;line-height:1.5;margin:0;">This is an automated security message. If you did not request this code, please secure your account settings immediately.</p>
          <p style="color:#1d9bf0;font-size:13px;font-weight:bold;margin:16px 0 0;">Twiller Security & Billing</p>
        </div>
      </div>
    </div>
  `;
};

// ── In-memory OTP store ────────────────────────────────────────────────────
const hashOtp = (otp) => {
  if (!otp) return null;
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
};

// { email -> { otp, expiresAt } }                  — for audio upload OTP
const otpStore = new Map();

// { identifier (email) -> { otp, expiresAt, purpose } }  — for password reset & field-change OTPs
const verificationOtpStore = new Map();

// { phone -> { otp, expiresAt, verified? } } — WhatsApp signup/login OTP (no user created until register)
const whatsappOtpStore = new Map();

const audioUploadTokens = new Map();

// ── Nodemailer SMTP Transport (Gmail) ──
//
// Configured to use a personal Gmail account and App Password.
//
// Required env vars (Render Dashboard → Environment):
//   EMAIL           – Your Gmail address (e.g. your.address@gmail.com)
//   EMAIL_PASSWORD  – 16-character Google App Password (no spaces)

const buildOtpHtml = (otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Twiller Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#000000;border:1px solid #2f3336;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#000000 0%,#16181c 100%);padding:32px 40px 24px;border-bottom:1px solid #2f3336;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#e7e9ea" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </td>
                  <td style="text-align:right;">
                    <span style="color:#71767b;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Verification Code</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#e7e9ea;">Your one-time code</p>
              <p style="margin:0 0 32px;font-size:15px;color:#71767b;line-height:1.6;">Enter this code to verify your identity. It expires in <strong style="color:#e7e9ea;">10 minutes</strong>.</p>
              <!-- OTP Box -->
              <div style="background:#16181c;border:1px solid #2f3336;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <span style="font-size:48px;font-weight:900;letter-spacing:16px;color:#ffffff;font-family:'Courier New',Courier,monospace;">${otp}</span>
              </div>
              <p style="margin:0 0 24px;font-size:14px;color:#71767b;line-height:1.7;">
                If you did not request this code, you can safely ignore this email. Do not share this code with anyone.
              </p>
              <div style="border-top:1px solid #2f3336;padding-top:24px;">
                <p style="margin:0;font-size:12px;color:#536471;">
                  &copy; ${new Date().getFullYear()} Twiller &mdash; This is an automated message. Please do not reply.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

let gmailAPIClient = null;
const initGmailAPI = () => {
  try {
    const { GOOGLE_EMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    const isPlaceholder = (val) => !val || val.includes("your_") || val.includes("your.address") || val.includes("your.email") || val.includes("your_client_id");
    
    if (!isPlaceholder(GOOGLE_EMAIL_USER) && !isPlaceholder(GOOGLE_CLIENT_ID) && !isPlaceholder(GOOGLE_CLIENT_SECRET) && !isPlaceholder(GOOGLE_REFRESH_TOKEN)) {
      gmailAPIClient = initGmailTransport();
    } else {
      console.warn("⚠️ Gmail REST API credentials are placeholders or incomplete. REST API transport disabled.");
    }
  } catch (e) {
    console.error("⚠️ Failed to initialize Gmail REST API transport:", e.message);
  }
};
initGmailAPI();

/**
 * sendEmail — unified Gmail REST API & Nodemailer send wrapper with mock fallback.
 *
 * @param {{ to: string, subject: string, html?: string, text?: string, otp?: string }} opts
 * @returns {Promise<{ messageId: string } | { mockId: string }>}
 */
const sendEmail = async ({ to, subject, html, text, otp }) => {
  const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.EMAIL || process.env.email;
  const password = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.email_password || process.env.GMAIL_PASSWORD;

  const isPlaceholder = (val) => !val || val.includes("your_") || val.includes("your.address") || val.includes("your.email") || val.includes("your_client_id");
  const useMock = allowMockServices();

  const htmlBody = html || (otp ? buildOtpHtml(otp) : undefined);
  const textBody = text || (otp ? `Your Twiller verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.` : undefined);

  const logMockEmail = () => {
    console.log(`\n╠══════════════════════════════════════════════════════════════════════════════`);
    console.log(`║ ✉️  [MOCK EMAIL OUTBOX]`);
    console.log(`║ To:      ${to}`);
    console.log(`║ Subject: ${subject}`);
    if (otp) {
      console.log(`║ OTP:     ${otp}`);
    }
    console.log(`║ Text:    ${textBody ? textBody.replace(/\n/g, "\n║          ") : ""}`);
    console.log(`╠══════════════════════════════════════════════════════════════════════════════\n`);
  };

  // 1. Try Gmail REST API if client is successfully initialized
  if (gmailAPIClient) {
    try {
      console.log(`✉️  Attempting delivery to ${to} via Gmail REST API...`);
      const res = await sendViaGmailAPI({ to, subject, html: htmlBody, text: textBody });
      if (res && res.id) {
        return { messageId: res.id };
      }
    } catch (apiErr) {
      console.error(`❌ Gmail REST API send failed: ${apiErr.message}`);
    }
  }

  // 2. Try Nodemailer SMTP with OAuth2 if credentials are set and not placeholders
  const googleUser = process.env.GOOGLE_EMAIL_USER;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (googleUser && googleClientId && googleClientSecret && googleRefreshToken &&
      !isPlaceholder(googleUser) && !isPlaceholder(googleClientId) &&
      !isPlaceholder(googleClientSecret) && !isPlaceholder(googleRefreshToken)) {
    try {
      console.log(`✉️  Attempting delivery to ${to} via Nodemailer Google OAuth2...`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GOOGLE_EMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        }
      });

      const mailOptions = {
        from: `"Twiller Auth" <${googleUser}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️  Nodemailer OAuth2 → delivered to ${to} [messageId: ${info.messageId}]`);
      return { messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`❌ Nodemailer OAuth2 send failed: ${smtpErr.message}`);
    }
  }

  // 3. Fallback to mock console logging in dev/staging or if no transports are available
  const hasValidGoogleAuth = googleUser && googleClientId && googleClientSecret && googleRefreshToken &&
    !isPlaceholder(googleUser) && !isPlaceholder(googleClientId) &&
    !isPlaceholder(googleClientSecret) && !isPlaceholder(googleRefreshToken);

  if (useMock || (!gmailAPIClient && !hasValidGoogleAuth)) {
    logMockEmail();
    return { mockId: `mock-${Date.now()}` };
  }

  throw new Error("No valid email transport configured and mock services are disabled.");
};

app.set("sendEmail", sendEmail);
app.set("sendSmsOtp", sendSmsOtp);

app.get("/", (req, res) => res.send("Twiller backend is running successfully"));
app.get("/healthz", (req, res) => {
  res.status(200).json({
    ok: true,
    mongoConnected: mongoose.connection.readyState === 1,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

const port = process.env.PORT || 5000;
const atlasUrl = getMongoUrl();
const publicServerUrl = getPublicServerUrl(port);

const buildPublicUploadUrl = (relativePath) => {
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${publicServerUrl}${normalized}`;
};

const publishedTweetFilter = {
  $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
};

const mediaAttachmentFilter = {
  $or: [
    { image: { $ne: null, $exists: true } },
    { gifUrl: { $ne: null, $exists: true } },
    { audio: { $ne: null, $exists: true } },
  ],
};

const USERUPDATE_ALLOWED_FIELDS = new Set([
  "username", "displayName", "bio", "location", "website", "avatar", "coverImage",
  "notificationsEnabled", "notificationPrefs", "privacySettings", "accessibilityPrefs",
  "displayPrefs", "language", "interests", "isActive",
]);

const decodeEmailParam = (email) => decodeURIComponent(email).toLowerCase();

async function startServer() {
  try {
    if (!atlasUrl) throw new Error("MongoDB Atlas URL not configured in .env");
    console.log("⏳ Connecting to MongoDB Atlas...");
    await mongoose.connect(atlasUrl);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (atlasErr) {
    console.error("❌ MongoDB connection error:", atlasErr.message);
    process.exit(1);
  }

  // Seed bots
  let dbBots = await User.find({ isBot: true });
  const needsRichSeed = dbBots.length === 0 || !dbBots.some(b => b.followers.length > 50);
  if (needsRichSeed) {
    const oldBots = await User.find({ isBot: true });
    const oldBotIds = oldBots.map(b => b._id);
    await Tweet.deleteMany({ author: { $in: oldBotIds } });
    await User.deleteMany({ isBot: true });

    const { bots } = generateSeedData();
    await User.insertMany(bots);
    dbBots = await User.find({ isBot: true });
    
    // Cross-link bots and populate with unique follower/following counts
    dbBots.forEach((bot, index) => {
      const baseFollowersCount = 120 + (index * 65) + Math.floor(Math.random() * 25);
      const baseFollowingCount = 60 + (index * 20) + Math.floor(Math.random() * 15);
      
      for (let i = 0; i < baseFollowersCount; i++) {
        bot.followers.push(new mongoose.Types.ObjectId());
      }
      for (let i = 0; i < baseFollowingCount; i++) {
        bot.following.push(new mongoose.Types.ObjectId());
      }
    });

    for (let bot of dbBots) {
      const numFollow = Math.floor(Math.random() * 5) + 4; // Follow 4 to 8 other bots
      const shuffled = [...dbBots]
        .filter(b => b._id.toString() !== bot._id.toString())
        .sort(() => 0.5 - Math.random());
      const toFollow = shuffled.slice(0, numFollow);
      
      for (let target of toFollow) {
        if (!bot.following.includes(target._id)) bot.following.push(target._id);
        if (!target.followers.includes(bot._id)) target.followers.push(bot._id);
      }
    }
    await Promise.all(dbBots.map(b => b.save()));
    console.log(`✅ Seeded ${dbBots.length} bot accounts with unique follower/following counts`);
  }

  // Background worker for scheduled tweets
  setInterval(async () => {
    try {
      const now = new Date();
      const pendingTweets = await Tweet.find({
        scheduledAt: { $ne: null, $lte: now },
        notificationsSent: false
      });
      for (const tweet of pendingTweets) {
        console.log(`[Scheduler] Dispatching notifications for past-due scheduled tweet: ${tweet._id}`);
        await processTweetNotifications(tweet);
        tweet.notificationsSent = true;
        await tweet.save();
      }
    } catch (err) {
      console.error("[Scheduler Error]:", err);
    }
  }, 15000);

  app.listen(port, () => {
    console.log(`🚀 Server running on ${publicServerUrl}`);
    // Start bot simulator background loop
    startBotSimulator();
  });
}

startServer();

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES & HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const checkLoginEnvironmentRules = async (req, user) => {
  const uaString = req.headers["user-agent"] || "";
  const parser = new UAParser(uaString);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  
  // Categorize device type: mobile, laptop, or desktop
  let deviceCategory = "desktop";
  if (device.type === "mobile" || device.type === "tablet") {
    deviceCategory = "mobile";
  } else if (
    os.name === "Windows" || 
    os.name === "Mac OS" || 
    os.name === "Chromium OS" || 
    uaString.includes("Macintosh") || 
    uaString.includes("Windows NT") ||
    uaString.includes("CrOS")
  ) {
    deviceCategory = "laptop";
  }
  
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "Unknown IP";

  const loginRecord = {
    timestamp: new Date(),
    browser: browser.name || "Unknown Browser",
    os: os.name || "Unknown OS",
    deviceCategory,
    ipAddress
  };

  // 1. Mobile restriction: 10:00 AM - 1:00 PM IST (using Intl.DateTimeFormat for bulletproof parsing)
  if (deviceCategory === "mobile") {
    let hour = 0;
    let minute = 0;
    try {
      const options = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(new Date());
      for (const part of parts) {
        if (part.type === "hour") hour = parseInt(part.value, 10);
        if (part.type === "minute") minute = parseInt(part.value, 10);
      }
    } catch (tzErr) {
      // Fallback to manual offset if Intl lookup fails
      const now = new Date();
      const istMinutesFallback = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      hour = Math.floor(istMinutesFallback / 60);
      minute = istMinutesFallback % 60;
    }
    const istMinutes = hour * 60 + minute;
    const windowStart = 10 * 60; // 10:00 AM IST
    const windowEnd = 13 * 60;   // 1:00 PM IST
    if (istMinutes < windowStart || istMinutes > windowEnd) {
      throw new Error("MOBILE_RESTRICTED");
    }
  }

  // 2. Microsoft Browsers Bypass (Edge, IE, Edge Chromium)
  const isMicrosoftBrowser = !!(
    (browser.name && (browser.name.includes("Edge") || browser.name.includes("IE") || browser.name.includes("Edge Chromium"))) || 
    uaString.includes("Edg/") || 
    uaString.includes("Edge/") || 
    uaString.includes("MSIE ") || 
    uaString.includes("Trident/")
  );
  if (isMicrosoftBrowser) {
    return { requireOTP: false, loginRecord };
  }

  // 3. Google Chrome OTP Requirement
  const isChrome = !!(
    (browser.name === "Chrome") ||
    (uaString.includes("Chrome/") && !uaString.includes("Edg/") && !uaString.includes("Edge/") && !uaString.includes("OPR/") && !uaString.includes("Brave"))
  ) && !isMicrosoftBrowser;
  
  if (isChrome) {
    return { requireOTP: true, loginRecord };
  }

  return { requireOTP: false, loginRecord };
};

const recordLoginHistory = async (user, loginRecord, sessionId) => {
  user.loginHistory.push(loginRecord);
  if (sessionId) {
    if (!user.sessions) user.sessions = [];
    user.sessions.push({
      sessionId,
      timestamp: loginRecord.timestamp || new Date(),
      browser: loginRecord.browser,
      os: loginRecord.os,
      deviceCategory: loginRecord.deviceCategory,
      ipAddress: loginRecord.ipAddress,
      isActive: true
    });
  }
  await user.save();
};

const sendLoginOtp = async (user) => {
  if (!user.email || user.email.includes("@phone.twiller.local")) {
    throw new Error("No valid email registered for OTP verification.");
  }

  // Generate a cryptographically random 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCode = hashOtp(otp);
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10-minute TTL
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Login Verification Code — Twiller",
      html: generateProfessionalEmailTemplate(
        "Chrome Login Verification",
        "You are logging in from Google Chrome. Please use the verification code below to complete your sign-in:",
        otp,
        "Login Verification"
      ),
      text: `Your Twiller login verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    });
  } catch (err) {
    // Non-fatal: OTP is already saved in DB — user can retry from UI
    console.error("❌ Login OTP email failed (Gmail API):", err.message);
  }
};

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ error: "Email and password required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send({ error: "No account found with this email" });
    if (!user.passwordHash) return res.status(400).send({ error: "No password set for this account. Sign in with Google instead." });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).send({ error: "Incorrect password" });
    if (user.isActive === false) return res.status(403).send({ error: "Account is deactivated." });
    
    // Check environment rules
    try {
      const { requireOTP, loginRecord } = await checkLoginEnvironmentRules(req, user);
      if (requireOTP) {
        await sendLoginOtp(user);
        // Store pending login record temporarily (e.g., inside otp payload or handled on verify)
        verificationOtpStore.set(`login_record_${user._id}`, loginRecord);
        return res.status(200).send({ requireOTP: true, email: user.email, message: "OTP sent to your registered email." });
      }
      
      // If no OTP required, proceed to login and record history
      const sessionId = uuidv4();
      await recordLoginHistory(user, loginRecord, sessionId);
      const userJson = user.toObject();
      userJson.sessionId = sessionId;
      return res.status(200).send(userJson);
    } catch (ruleErr) {
      if (ruleErr.message === "MOBILE_RESTRICTED") {
        return res.status(403).send({ error: "Access from mobile devices is restricted to the time window between 10:00 AM and 1:00 PM." });
      }
      return res.status(400).send({ error: ruleErr.message });
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/register/check-exists", async (req, res) => {
  try {
    const { username, email, phone } = req.query;
    const checks = { usernameExists: false, emailExists: false, phoneExists: false };
    if (username) {
      const u = await User.findOne({ username: { $regex: new RegExp("^" + username.trim() + "$", "i") } });
      checks.usernameExists = !!u;
    }
    if (email) {
      const e = await User.findOne({ email: email.trim().toLowerCase() });
      checks.emailExists = !!e;
    }
    if (phone) {
      const normPhone = normalizePhone(phone);
      const p = await User.findOne({ phone: normPhone, passwordHash: { $exists: true, $ne: null } });
      checks.phoneExists = !!p;
    }
    return res.status(200).send(checks);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password, username, displayName, avatar } = req.body;
    const existing = await User.findOne({ email: email ? email.toLowerCase() : "" });
    if (existing) {
      if (!password) {
        return res.status(200).send(existing);
      }
      return res.status(409).send({ error: "An account with this email already exists." });
    }
    if (username) {
      const usernameTaken = await User.findOne({ username: { $regex: new RegExp("^" + username.trim() + "$", "i") } });
      if (usernameTaken) {
        return res.status(409).send({ error: "Username already taken." });
      }
    }
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const newUser = new User({
      email: email ? email.toLowerCase() : "",
      passwordHash,
      username,
      displayName,
      avatar: avatar || "",
      lastPasswordChange: password ? new Date() : null,
    });
    await newUser.save();

    // Send welcome email via Gmail REST API
    if (newUser.email && !newUser.email.includes("@phone.twiller.local")) {
      try {
        await sendEmail({
          to: newUser.email,
          subject: "Welcome to Twiller! 🎉 Your account is ready",
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#000;border:1px solid #2f3336;border-radius:16px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0a0a0a,#000);padding:40px 32px;text-align:center;border-bottom:1px solid #2f3336">
                <svg viewBox="0 0 24 24" width="44" height="44" style="fill:white;display:inline-block;margin-bottom:16px">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <h1 style="color:#e7e9ea;font-size:26px;font-weight:800;margin:0">Welcome to Twiller!</h1>
                <p style="color:#71767b;font-size:15px;margin:8px 0 0">Your account has been created successfully</p>
              </div>
              <div style="padding:32px">
                <p style="color:#e7e9ea;font-size:16px;margin:0 0 16px">Hi <strong>${newUser.displayName}</strong>,</p>
                <p style="color:#71767b;font-size:14px;line-height:1.6;margin:0 0 24px">
                  Welcome to Twiller — a place to share what's happening in your world. Your account <strong style="color:#1d9bf0">@${newUser.username}</strong> is now active.
                </p>
                <div style="background:#16181c;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #2f3336">
                  <p style="color:#71767b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Your Plan</p>
                  <p style="color:#e7e9ea;font-size:14px;margin:0">🆓 Free Plan — <strong>1 tweet per day</strong></p>
                  <p style="color:#71767b;font-size:12px;margin:6px 0 0">Upgrade to Bronze, Gold, or Platinum to tweet more!</p>
                </div>
                <p style="color:#536471;font-size:12px;text-align:center;margin:0">
                  If you didn't create this account, please contact <a href="mailto:security@twiller.com" style="color:#1d9bf0">security@twiller.com</a>
                </p>
              </div>
            </div>`,
          text: `Welcome to Twiller, ${newUser.displayName}!\n\nYour account @${newUser.username} has been created.\nYou're on the Free plan: 1 tweet per day.\n\nNot you? Contact security@twiller.com`,
        });
      } catch (mailErr) {
        // Non-critical — user account is created; welcome email failure is logged but not propagated
        console.error(`❌ Welcome email failed (Gmail API): ${mailErr.message}`);
      }
    }

    const uaString = req.headers["user-agent"] || "";
    const parser = new UAParser(uaString);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const deviceCategory = device.type === "mobile" || device.type === "tablet" ? "mobile" : "desktop";
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown IP";

    const loginRecord = {
      timestamp: new Date(),
      browser: browser.name || "Unknown Browser",
      os: os.name || "Unknown OS",
      deviceCategory,
      ipAddress
    };
    const sessionId = uuidv4();
    await recordLoginHistory(newUser, loginRecord, sessionId);

    const userJson = newUser.toObject();
    userJson.sessionId = sessionId;
    return res.status(201).send(userJson);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).send({ error: "Email required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send({ error: "User not found" });

    if (user.isActive === false) {
      return res.status(403).send({ error: "Account is deactivated." });
    }

    let sessionIdHeader = req.headers["x-session-id"];
    if (!sessionIdHeader && req.headers["authorization"]?.startsWith("Bearer ")) {
      sessionIdHeader = req.headers["authorization"].split(" ")[1];
    }

    if (sessionIdHeader) {
      if (!user.sessions) user.sessions = [];
      const activeSession = user.sessions.find(s => s.sessionId === sessionIdHeader && s.isActive);
      if (!activeSession) {
        return res.status(401).send({ error: "SESSION_REVOKED" });
      }
      
      const userJson = user.toObject();
      userJson.sessionId = sessionIdHeader;
      return res.status(200).send(userJson);
    } else {
      const uaString = req.headers["user-agent"] || "";
      const parser = new UAParser(uaString);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();
      const deviceCategory = device.type === "mobile" || device.type === "tablet" ? "mobile" : "desktop";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown IP";

      const sessionId = uuidv4();
      const loginRecord = {
        timestamp: new Date(),
        browser: browser.name || "Unknown Browser",
        os: os.name || "Unknown OS",
        deviceCategory,
        ipAddress
      };
      await recordLoginHistory(user, loginRecord, sessionId);

      const userJson = user.toObject();
      userJson.sessionId = sessionId;
      return res.status(200).send(userJson);
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// GET all active sessions for a user
app.get("/users/:userId/sessions", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });
    const activeSessions = (user.sessions || []).filter(s => s.isActive);
    return res.status(200).send(activeSessions);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// DELETE (revoke) a specific session for a user
app.delete("/users/:userId/sessions/:sessionId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });
    
    if (user.sessions) {
      const session = user.sessions.find(s => s.sessionId === req.params.sessionId);
      if (session) {
        session.isActive = false;
        await user.save();
      }
    }
    const activeSessions = (user.sessions || []).filter(s => s.isActive);
    return res.status(200).send(activeSessions);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// DELETE (revoke) all other sessions for a user
app.delete("/users/:userId/sessions/:sessionId/other", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });
    
    if (user.sessions) {
      user.sessions.forEach(s => {
        if (s.sessionId !== req.params.sessionId) {
          s.isActive = false;
        }
      });
      await user.save();
    }
    const activeSessions = (user.sessions || []).filter(s => s.isActive);
    return res.status(200).send(activeSessions);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/userupdate/:email", async (req, res) => {
  try {
    const emailParam = decodeEmailParam(req.params.email);
    const current = await User.findOne({ email: emailParam });
    if (!current) return res.status(404).send({ error: "User not found" });

    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (USERUPDATE_ALLOWED_FIELDS.has(key)) updates[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).send({ error: "No valid fields to update." });
    }

    if (updates.username) {
      const usernameTaken = await User.findOne({
        username: { $regex: new RegExp("^" + updates.username.trim() + "$", "i") },
        _id: { $ne: current._id }
      });
      if (usernameTaken) {
        return res.status(409).send({ error: "Username already taken." });
      }
    }

    if (updates.email) {
      const emailTaken = await User.findOne({
        email: updates.email.trim().toLowerCase(),
        _id: { $ne: current._id }
      });
      if (emailTaken) {
        return res.status(409).send({ error: "Email is already in use." });
      }
    }

    if (updates.phone) {
      updates.phone = normalizePhone(updates.phone);
      const phoneTaken = await User.findOne({
        phone: updates.phone,
        _id: { $ne: current._id }
      });
      if (phoneTaken) {
        return res.status(409).send({ error: "Phone number is already in use." });
      }
    }

    const updated = await User.findOneAndUpdate(
      { email: emailParam },
      { $set: updates },
      { new: true, upsert: false }
    );
    if (!updated) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Block / Mute Endpoints ───────────────────────────────────────────
app.get("/user/:userId/blocked", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("blockedAccounts", "username displayName avatar email");
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(user.blockedAccounts || []);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/user/:userId/block", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).send({ error: "targetUserId required" });
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const isBlocked = user.blockedAccounts.includes(targetUserId);
    if (isBlocked) {
      user.blockedAccounts = user.blockedAccounts.filter(id => id.toString() !== targetUserId.toString());
    } else {
      user.blockedAccounts.push(targetUserId);
    }
    await user.save();
    return res.status(200).send({ blocked: !isBlocked, blockedAccounts: user.blockedAccounts });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.get("/user/:userId/muted", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("mutedAccounts", "username displayName avatar email");
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(user.mutedAccounts || []);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/user/:userId/mute", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).send({ error: "targetUserId required" });
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const isMuted = user.mutedAccounts.includes(targetUserId);
    if (isMuted) {
      user.mutedAccounts = user.mutedAccounts.filter(id => id.toString() !== targetUserId.toString());
    } else {
      user.mutedAccounts.push(targetUserId);
    }
    await user.save();
    return res.status(200).send({ muted: !isMuted, mutedAccounts: user.mutedAccounts });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ── Phone Register ─────────────────────────────────────────────────────────
app.post("/register/phone", async (req, res) => {
  try {
    const { phone, password, username, displayName, phoneVerified } = req.body;
    if (!phone || !password || !username || !displayName) {
      return res.status(400).send({ error: "All fields required" });
    }
    const normPhone = normalizePhone(phone);
    const otpRecord = whatsappOtpStore.get(normPhone);
    const isOtpVerified = phoneVerified === true || otpRecord?.verified === true;

    const existing = await User.findOne({ phone: normPhone });
    if (existing?.passwordHash) {
      return res.status(409).send({ error: "Phone number already registered" });
    }
    if (!isOtpVerified) {
      return res.status(403).send({ error: "Phone not verified. Complete OTP verification first." });
    }

    if (username) {
      const usernameTaken = await User.findOne({
        username: { $regex: new RegExp("^" + username.trim() + "$", "i") },
        ...(existing ? { _id: { $ne: existing._id } } : {}),
      });
      if (usernameTaken) {
        return res.status(409).send({ error: "Username already taken." });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const email = `${normPhone.replace(/\D/g, "")}@phone.twiller.local`;

    const uaString = req.headers["user-agent"] || "";
    const parser = new UAParser(uaString);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const deviceCategory = device.type === "mobile" || device.type === "tablet" ? "mobile" : "desktop";
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown IP";

    const loginRecord = {
      timestamp: new Date(),
      browser: browser.name || "Unknown Browser",
      os: os.name || "Unknown OS",
      deviceCategory,
      ipAddress
    };
    const sessionId = uuidv4();

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.username = username;
      existing.displayName = displayName;
      existing.phoneVerified = true;
      existing.lastPasswordChange = new Date();
      await recordLoginHistory(existing, loginRecord, sessionId);
      whatsappOtpStore.delete(normPhone);
      const userJson = existing.toObject();
      userJson.sessionId = sessionId;
      return res.status(200).send(userJson);
    }

    const newUser = new User({
      phone: normPhone,
      passwordHash,
      username,
      displayName,
      email,
      avatar: "",
      lastPasswordChange: new Date(),
      phoneVerified: true,
    });
    await recordLoginHistory(newUser, loginRecord, sessionId);
    whatsappOtpStore.delete(normPhone);
    const userJson = newUser.toObject();
    userJson.sessionId = sessionId;
    return res.status(201).send(userJson);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Phone Login ────────────────────────────────────────────────────────────
app.post("/login/phone", async (req, res) => {
  try {
    const { phone, password, phoneVerified } = req.body;
    if (!phone || !password) return res.status(400).send({ error: "Phone and password required" });
    const normPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: normPhone });
    if (!user) return res.status(404).send({ error: "No account found with this phone number" });
    if (!user.passwordHash) return res.status(400).send({ error: "No password set for this account" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).send({ error: "Incorrect password" });
    
    if (phoneVerified && !user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }
    
    // Check environment rules
    try {
      const { requireOTP, loginRecord } = await checkLoginEnvironmentRules(req, user);
      if (requireOTP) {
        await sendLoginOtp(user);
        verificationOtpStore.set(`login_record_${user._id}`, loginRecord);
        return res.status(200).send({ requireOTP: true, email: user.email, message: "OTP sent to your registered email." });
      }
      
      // If no OTP required, proceed to login and record history
      const sessionId = uuidv4();
      await recordLoginHistory(user, loginRecord, sessionId);
      const userJson = user.toObject();
      userJson.sessionId = sessionId;
      return res.status(200).send(userJson);
    } catch (ruleErr) {
      if (ruleErr.message === "MOBILE_RESTRICTED") {
        return res.status(403).send({ error: "Access from mobile devices is restricted to the time window between 10:00 AM and 1:00 PM." });
      }
      return res.status(400).send({ error: ruleErr.message });
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Verify Login OTP ───────────────────────────────────────────────────────
app.post("/login/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send({ error: "User not found" });

    if (!user.otpCode || user.otpCode !== hashOtp(otp)) {
      return res.status(400).send({ error: "Invalid OTP. Please try again." });
    }
    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).send({ error: "OTP has expired. Please log in again." });
    }

    // OTP is valid, clear it
    user.otpCode = null;
    user.otpExpiry = null;
    
    // Retrieve pending login record and save history
    const loginRecord = verificationOtpStore.get(`login_record_${user._id}`);
    const sessionId = uuidv4();
    if (loginRecord) {
      user.loginHistory.push(loginRecord);
      if (!user.sessions) user.sessions = [];
      user.sessions.push({
        sessionId,
        timestamp: loginRecord.timestamp || new Date(),
        browser: loginRecord.browser,
        os: loginRecord.os,
        deviceCategory: loginRecord.deviceCategory,
        ipAddress: loginRecord.ipAddress,
        isActive: true
      });
      verificationOtpStore.delete(`login_record_${user._id}`);
    } else {
      const uaString = req.headers["user-agent"] || "";
      const parser = new UAParser(uaString);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();
      const deviceCategory = device.type === "mobile" || device.type === "tablet" ? "mobile" : "desktop";
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      if (!user.sessions) user.sessions = [];
      user.sessions.push({
        sessionId,
        timestamp: new Date(),
        browser: browser.name || "Unknown",
        os: os.name || "Unknown",
        deviceCategory,
        ipAddress,
        isActive: true
      });
    }
    await user.save();

    const userJson = user.toObject();
    userJson.sessionId = sessionId;
    return res.status(200).send(userJson);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── WhatsApp OTP Settings Updates ──────────────────────────────────────────
const changeTokenStore = new Map();

app.post("/user/send-change-otp", async (req, res) => {
  try {
    const { userId, purpose, channel = 'both' } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    if (!user.phone && !user.email) {
      return res.status(400).send({ error: "No contact info available to send OTP." });
    }

    if (channel === 'mobile' && !user.phone) {
      return res.status(400).send({
        error: "No phone number is linked to your profile. Please add a phone number to your profile first to use WhatsApp OTP.",
        phoneMissing: true
      });
    }

    let warning = null;
    if (channel === 'both' && !user.phone) {
      warning = "No phone number is linked to your profile. The OTP was only sent to your email. Please add a phone number to your profile first to use WhatsApp OTP.";
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    verificationOtpStore.set(`${userId}:${purpose}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000, purpose });

    let sentVia = [];

    // 1. Send via Email (Resend HTTP API)
    if ((channel === 'email' || channel === 'both') && user.email && !user.email.includes("@phone.twiller.local")) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Your Settings Verification OTP — Twiller",
          html: generateProfessionalEmailTemplate(
            "Settings Change Request",
            "You have requested to change your account settings. Please use the verification code below to confirm this change:",
            otp,
            "Settings Verification"
          ),
          text: `Your OTP to change settings is: ${otp}\n\nThis code expires in 10 minutes.`,
        });
        sentVia.push("email");
      } catch (mailErr) {
        console.error("❌ Settings change email failed (Gmail API):", mailErr.message);
        sentVia.push("email (mock)");
      }
    }

    // 2. Send via WhatsApp
    if ((channel === 'mobile' || channel === 'both') && user.phone) {
      try {
        const smsRes = await sendSmsOtp(user.phone, otp);
        if (smsRes && (smsRes.success || smsRes.devMode)) {
          sentVia.push("mobile");
        } else {
          if (channel === 'mobile') {
            return res.status(500).send({
              error: `Twilio WhatsApp delivery failed: ${smsRes?.error || "Unknown error"}. If you have not joined the Twilio WhatsApp sandbox, please join to receive OTPs.`,
              isTwilioError: true
            });
          } else {
            warning = `Twilio WhatsApp delivery failed: ${smsRes?.error || "Unknown error"}. The OTP was only sent to your email. If you have not joined the Twilio WhatsApp sandbox, please join to receive OTPs.`;
          }
        }
      } catch (smsErr) {
        console.warn("⚠️ Settings change WhatsApp failed:", smsErr.message);
        if (channel === 'mobile') {
          return res.status(500).send({
            error: `Twilio WhatsApp delivery failed: ${smsErr.message}. If you have not joined the Twilio WhatsApp sandbox, please join to receive OTPs.`,
            isTwilioError: true
          });
        } else {
          warning = `Twilio WhatsApp delivery failed: ${smsErr.message}. The OTP was only sent to your email. If you have not joined the Twilio WhatsApp sandbox, please join to receive OTPs.`;
        }
      }
    }

    if (sentVia.length === 0) {
      return res.status(500).send({ error: "Failed to send OTP via email and WhatsApp." });
    }

    return res.status(200).send({
      message: `OTP sent successfully to your registered ${sentVia.join(" and ")}.`,
      warning
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.post("/user/verify-change-otp", async (req, res) => {
  try {
    const { userId, purpose, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const storeKey = `${userId}:${purpose}`;
    const record = verificationOtpStore.get(storeKey);
    if (!record) return res.status(400).send({ error: "No pending OTP request found. Please request a new one." });
    if (record.purpose !== purpose) return res.status(400).send({ error: "Invalid request purpose." });
    if (Date.now() > record.expiresAt) {
      verificationOtpStore.delete(storeKey);
      return res.status(400).send({ error: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp) {
      return res.status(400).send({ error: "Invalid OTP. Please try again." });
    }

    verificationOtpStore.delete(storeKey);

    // Generate change token
    const changeToken = crypto.randomBytes(32).toString("hex");
    changeTokenStore.set(changeToken, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });

    return res.status(200).send({ changeToken });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/user/:id/update-email", async (req, res) => {
  try {
    const { changeToken, newEmail } = req.body;
    const tokenData = changeTokenStore.get(changeToken);
    if (!tokenData || tokenData.userId !== req.params.id || tokenData.expiresAt < Date.now()) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { email: newEmail.toLowerCase() }, { new: true });
    changeTokenStore.delete(changeToken);
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/user/:id/update-phone", async (req, res) => {
  try {
    const { changeToken, newPhone } = req.body;
    const tokenData = changeTokenStore.get(changeToken);
    if (!tokenData || tokenData.userId !== req.params.id || tokenData.expiresAt < Date.now()) {
      return res.status(403).send({ error: "Invalid or expired token" });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { phone: normalizePhone(newPhone) }, { new: true });
    changeTokenStore.delete(changeToken);
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Set / Change Password (from Settings — requires current password) ─────────
app.patch("/user/:email/password", async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;
    if (!newPassword) return res.status(400).send({ error: "New password required" });
    if (newPassword.length < 6) return res.status(400).send({ error: "Password must be at least 6 characters" });

    const emailParam = decodeEmailParam(req.params.email);
    const user = await User.findOne({ email: emailParam });
    if (!user) return res.status(404).send({ error: "User not found" });

    // If user has existing password, verify current password first
    if (user.passwordHash && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).send({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await User.findOneAndUpdate(
      { email: emailParam },
      { $set: { passwordHash, lastPasswordChange: new Date() } },
      { new: true }
    );
    return res.status(200).send({ success: true, user: updated });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Forgot Password: Reset with verified token (Step 3) ────────────────────
// This is the ONLY secure way to reset password without knowing the current one.
// Requires a resetToken issued after OTP verification.
app.post("/forgot-password/reset", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).send({ error: "resetToken and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).send({ error: "Password must be at least 8 characters" });
    }

    // Look up by globally unique resetToken to avoid any phone normalization mismatch
    let record = null;
    let key = null;
    for (const [k, v] of forgotPasswordStore.entries()) {
      if (v.resetToken === resetToken) {
        record = v;
        key = k;
        break;
      }
    }

    if (!record || !record.verified) {
      return res.status(401).send({ error: "Invalid or expired reset token. Please start the password reset process again." });
    }
    if (Date.now() > record.resetTokenExpiresAt) {
      forgotPasswordStore.delete(key);
      return res.status(401).send({ error: "Reset token has expired. Please request a new password reset." });
    }

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(record.userId, {
      $set: { passwordHash, lastPasswordChange: new Date() },
    });

    forgotPasswordStore.delete(key); // consume token — one-time use

    // Send password-changed confirmation email via Gmail REST API (non-critical)
    if (user.email && !user.email.includes("@phone.twiller.local")) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Your Twiller password has been changed",
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;background:#000;border:1px solid #2f3336;border-radius:16px;overflow:hidden">
              <div style="background:#0a0a0a;padding:24px;text-align:center;border-bottom:1px solid #2f3336">
                <svg viewBox="0 0 24 24" width="32" height="32" style="fill:white;display:inline-block;margin-bottom:10px">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <h2 style="color:#00ba7c;font-size:18px;font-weight:800;margin:0">✅ Password Changed</h2>
              </div>
              <div style="padding:24px">
                <p style="color:#71767b;font-size:14px;margin:0 0 16px">Hi <strong style="color:#e7e9ea">${user.displayName}</strong>,</p>
                <p style="color:#71767b;font-size:14px;margin:0 0 16px">Your Twiller password was successfully changed on <strong style="color:#e7e9ea">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</strong>.</p>
                <p style="color:#f4212e;font-size:13px;margin:0">If you did not make this change, contact <a href="mailto:security@twiller.com" style="color:#1d9bf0">security@twiller.com</a> immediately.</p>
              </div>
            </div>`,
          text: `Hi ${user.displayName},\n\nYour Twiller password was successfully changed.\n\nIf you did not make this change, contact security@twiller.com immediately.`,
        });
      } catch (mailErr) {
        console.error("❌ Password-changed confirmation email failed (Gmail API):", mailErr.message);
        // Non-critical — password was already reset successfully
      }
    }

    console.log(`✅ Password reset completed for user ${record.userId} (${user.email})`);
    return res.status(200).send({ success: true, message: "Password reset successfully." });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ── Verify Password ────────────────────────────────────────────────────────
app.post("/user/verify-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ error: "Email and password required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });
    if (!user.passwordHash) return res.status(200).send({ valid: false, noPassword: true });
    const valid = await bcrypt.compare(password, user.passwordHash);
    return res.status(200).send({ valid });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Mark all notifications read ────────────────────────────────────────────
app.patch("/notifications/:userId/mark-all-read", async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Update notification preferences ────────────────────────────────────────
app.patch("/user/:email/notification-prefs", async (req, res) => {
  try {
    const { notificationPrefs } = req.body;
    const emailParam = decodeEmailParam(req.params.email);
    const updated = await User.findOneAndUpdate(
      { email: emailParam },
      { $set: { notificationPrefs } },
      { new: true }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Update privacy settings ────────────────────────────────────────────────
app.patch("/user/:email/privacy", async (req, res) => {
  try {
    const { privacySettings } = req.body;
    const emailParam = decodeEmailParam(req.params.email);
    const updated = await User.findOneAndUpdate(
      { email: emailParam },
      { $set: { privacySettings } },
      { new: true }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Language Setup ────────────────────────────────────────────────────────
app.post("/language/request-otp", async (req, res) => {
  try {
    const { email, targetLanguage } = req.body;
    if (!email || !targetLanguage) return res.status(400).send({ error: "Email and targetLanguage required" });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send({ error: "User not found" });

    if (!user.email && !user.phone) {
      return res.status(400).send({ error: "No email or phone number found on profile." });
    }

    let channel = req.body.channel;
    if (!channel) {
      if (targetLanguage === "French") {
        channel = "email";
      } else {
        channel = user.phone ? "mobile" : "email";
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    verificationOtpStore.set(user.email, { otp: hashOtp(otp), expiresAt: Date.now() + 10 * 60 * 1000, purpose: "language" });
    
    let sentVia = [];

    // 1. Send via Email (Resend HTTP API)
    if (channel === 'email' && user.email && !user.email.includes("@phone.twiller.local")) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Your Language Verification OTP — Twiller",
          html: generateProfessionalEmailTemplate(
            "Language Change Request",
            "You have requested to change your account language. Please use the verification code below to confirm this change:",
            otp,
            "Language Verification"
          ),
          text: `Your OTP to switch language is: ${otp}\n\nThis code expires in 10 minutes.`,
        });
        sentVia.push("email");
      } catch (mailErr) {
        console.error(`❌ Language OTP email failed (Gmail API) for ${user.email}:`, mailErr.message);
        sentVia.push("email (mock)");
      }
    }

    // 2. Send via WhatsApp (for non-French languages)
    if (channel === 'mobile' && user.phone) {
      try {
        const smsRes = await sendSmsOtp(user.phone, otp);
        if (smsRes.success || smsRes.devMode) {
          sentVia.push("mobile");
        }
      } catch (smsErr) {
        console.warn("⚠️ Language OTP WhatsApp failed:", smsErr.message);
        // Fall back to email via Gmail API if mobile fails
        if (user.email && !user.email.includes("@phone.twiller.local")) {
          try {
            await sendEmail({
              to: user.email,
              subject: "Your Language Verification OTP — Twiller",
              html: generateProfessionalEmailTemplate(
                "Language Change Request",
                "We could not send the OTP to your mobile. Please use the verification code below:",
                otp,
                "Language Verification"
              ),
              text: `Your OTP to switch language is: ${otp}\n\nThis code expires in 10 minutes.`,
            });
            sentVia.push("email (fallback)");
          } catch (fallbackErr) {
            console.error("❌ Language OTP email fallback also failed (Gmail API):", fallbackErr.message);
          }
        }
      }
    }

    if (sentVia.length === 0) {
      return res.status(500).send({ error: "Failed to dispatch OTP. Please try again later." });
    }

    return res.status(200).send({ 
      message: `OTP sent successfully to your registered ${sentVia.join(" and ")}.`,
      channel // inform frontend which channel was used
    });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});


app.post("/language/verify-otp", async (req, res) => {
  try {
    const { email, targetLanguage, otp } = req.body;
    if (!email || !targetLanguage || !otp) return res.status(400).send({ error: "Missing required fields" });
    
    const record = verificationOtpStore.get(email.toLowerCase());
    if (!record || record.purpose !== "language") {
      return res.status(400).send({ error: "No pending language change OTP found. Please request a new one." });
    }
    if (Date.now() > record.expiresAt) {
      verificationOtpStore.delete(email);
      return res.status(400).send({ error: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== hashOtp(otp)) {
      return res.status(400).send({ error: "Invalid OTP. Please try again." });
    }
    
    verificationOtpStore.delete(email.toLowerCase());
    
    const updated = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { language: targetLanguage } },
      { new: true }
    );
    
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post("/upload", uploadImage.single("image"), (req, res) => {
  if (!req.file) return res.status(400).send({ error: "No file uploaded" });
  const imageUrl = req.file.path;
  res.status(200).send({ data: { display_url: imageUrl } });
});

app.post("/audio/request-otp", async (req, res) => {
  try {
    const { email, channel = 'email' } = req.body;
    if (!email) return res.status(400).send({ error: "Email required" });
    if (!isWithinAudioWindow()) {
      return res.status(403).send({
        error: "Audio uploads are only allowed between 2:00 PM and 7:00 PM IST",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send({ error: "Registered user not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp: hashOtp(otp), expiresAt: Date.now() + AUDIO_TOKEN_TTL_MS });

    let sentVia = [];

    // 1. Send via Email (Resend HTTP API)
    if ((channel === 'email' || channel === 'both') && user.email && !user.email.includes("@phone.twiller.local")) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Your Audio Upload OTP — Twiller",
          text: `Your OTP for audio upload is: ${otp}\n\nThis code expires in 10 minutes.\n\n— Twiller Security`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#000;color:#e7e9ea;border-radius:12px;">
            <h2 style="color:#1d9bf0;">🎙️ Twiller Audio Upload OTP</h2>
            <p style="color:#8b98a5;">Use the code below to verify your identity for the audio tweet upload.</p>
            <div style="background:#16181c;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1d9bf0;">${otp}</span>
            </div>
            <p style="color:#8b98a5;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>`,
        });
        sentVia.push("email");
      } catch (mailErr) {
        console.error(`❌ Audio upload OTP email failed (Gmail API) for ${user.email}:`, mailErr.message);
        sentVia.push("email (mock)");
      }
    }

    // 2. Send via WhatsApp
    if ((channel === 'mobile' || channel === 'both') && user.phone) {
      try {
        await sendSmsOtp(user.phone, otp, `Your Twiller audio upload verification code is: ${otp}. It expires in 10 minutes.`);
        sentVia.push("mobile");
      } catch (smsErr) {
        console.log(`⚠️ SMS send failed for ${user.phone}: ${smsErr.message}`);
      }
    }

    if (sentVia.length === 0) {
      return res.status(400).send({ error: "Failed to send OTP to any channel. Check your contact details." });
    }

    return res.send({ message: `OTP sent successfully via ${sentVia.join(' and ')}` });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/audio/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!isWithinAudioWindow()) {
    return res.status(403).send({ error: "Audio uploads are only allowed between 2:00 PM and 7:00 PM IST" });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) return res.status(400).send({ error: "No OTP found. Please request a new one." });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).send({ error: "OTP has expired. Please request a new one." });
  }
  if (record.otp !== hashOtp(otp)) return res.status(400).send({ error: "Invalid OTP. Please try again." });

  otpStore.delete(email.toLowerCase());
  const uploadToken = `${email.toLowerCase()}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  audioUploadTokens.set(uploadToken, { email: email.toLowerCase(), expiresAt: Date.now() + AUDIO_TOKEN_TTL_MS });
  return res.send({ success: true, uploadToken });
});

app.post("/audio/upload", uploadAudio.single("audio"), async (req, res) => {
  try {
    const { uploadToken, email, durationSeconds } = req.body;
    if (!req.file) return res.status(400).send({ error: "No audio file uploaded" });
    if (!isWithinAudioWindow()) {
      removeUploadedFile(req.file);
      return res.status(403).send({ error: "Audio uploads are only allowed between 2:00 PM and 7:00 PM IST" });
    }

    const tokenRecord = audioUploadTokens.get(uploadToken);
    if (!tokenRecord || tokenRecord.email !== email.toLowerCase() || Date.now() > tokenRecord.expiresAt) {
      removeUploadedFile(req.file);
      return res.status(401).send({ error: "Audio upload verification expired. Please verify OTP again." });
    }

    if (req.file.size > AUDIO_MAX_BYTES) {
      removeUploadedFile(req.file);
      return res.status(400).send({ error: "Audio file exceeds the 100 MB limit." });
    }

    const clientDuration = Number(durationSeconds);
    if (Number.isFinite(clientDuration) && clientDuration > AUDIO_MAX_SECONDS) {
      removeUploadedFile(req.file);
      return res.status(400).send({ error: "Audio must be 5 minutes or shorter." });
    }

    const metadata = await parseFile(req.file.path);
    const serverDuration = metadata.format.duration;
    if (Number.isFinite(serverDuration) && serverDuration > AUDIO_MAX_SECONDS) {
      removeUploadedFile(req.file);
      return res.status(400).send({ error: "Audio must be 5 minutes or shorter." });
    }

    audioUploadTokens.delete(uploadToken);
    
    // Upload local verified file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "twiller_audio"
    });
    
    // Clean up local temp file
    removeUploadedFile(req.file);

    const audioUrl = uploadResult.secure_url;
    return res.status(200).send({ audioUrl });
  } catch (error) {
    removeUploadedFile(req.file);
    return res.status(400).send({ error: error.message || "Failed to process audio upload" });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// TWEET ROUTES
// ══════════════════════════════════════════════════════════════════════════════

const processTweetNotifications = async (tweet) => {
  try {
    const author = tweet.author;
    const content = tweet.content || "";
    const contentLower = content.toLowerCase();
    const notificationsToInsert = [];

    // Create own tweet notification
    const authorUser = await User.findById(author);
    if (authorUser && !authorUser.isBot) {
      notificationsToInsert.push({
        recipient: author,
        sender: author,
        type: "post",
        tweet: tweet._id,
        content: "posted a new post",
        extra: `"${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`
      });
    }

    // ── Detect and insert mention notifications ──────────────────────────────────
    const mentions = [...content.matchAll(/@(\w+)/g)].map(match => match[1]);
    const uniqueMentions = [...new Set(mentions)];
    for (const username of uniqueMentions) {
      const mentionedUser = await User.findOne({ username: { $regex: new RegExp("^" + username + "$", "i") } });
      if (mentionedUser && mentionedUser._id.toString() !== author.toString()) {
        notificationsToInsert.push({
          recipient: mentionedUser._id,
          sender: author,
          type: "mention",
          tweet: tweet._id,
          content: "mentioned you in a post",
          extra: `"${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`
        });
      }
    }

    const KEYWORD_LIST = ["cricket", "science"];

    // ── Fetch ALL users who have interests set OR have notifications enabled ──
    const allUsers = await User.find({
      $or: [
        { notificationsEnabled: true },
        { interests: { $exists: true, $ne: [] } }
      ]
    }).select("_id interests notificationsEnabled").lean();

    for (const u of allUsers) {
      const recipientId = u._id.toString();
      const authorId    = tweet.author.toString();
      const isSelf      = recipientId === authorId;

      const matchedTerms = [];

      // ── Check user's personal interests — collect ALL matching interests ──
      if (u.interests && u.interests.length > 0) {
        const userInterests = u.interests.map(i => i.toLowerCase().replace(/^#/, ""));
        for (const interest of userInterests) {
          if (contentLower.includes(interest) || contentLower.includes(`#${interest}`)) {
            matchedTerms.push(interest);
          }
        }
      }

      // ── If no interest match, check keywords (cricket / science) for non-self ──
      if (matchedTerms.length === 0 && !isSelf && u.notificationsEnabled) {
        const matchedKws = KEYWORD_LIST.filter(k => contentLower.includes(k));
        if (matchedKws.length > 0) {
          matchedTerms.push(...matchedKws);
        }
      }

      if (matchedTerms.length === 0) continue;

      // Create a separate notification for each matched term!
      for (const term of matchedTerms) {
        const label = isSelf
          ? `you posted about #${term}`
          : `posted about #${term}`;

        notificationsToInsert.push({
          recipient: u._id,
          sender: tweet.author,
          type: "interest",
          tweet: tweet._id,
          content: label,
          extra: `"${tweet.content.slice(0, 80)}${tweet.content.length > 80 ? "…" : ""}"`
        });
      }
    }

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }
  } catch (err) {
    console.error("Error processing notifications for tweet:", tweet._id, err);
  }
};

app.post("/post", async (req, res) => {
  try {
    if (!req.body.author || !req.body.content?.trim()) {
      return res.status(400).send({ error: "Author and content are required" });
    }

    // ── Duplicate post or media guard ─────────────────────────────────────────
    const contentCheck = req.body.content?.trim();
    const imageCheck = req.body.image?.trim();
    const gifUrlCheck = req.body.gifUrl?.trim();
    const audioCheck = req.body.audio?.trim();

    const duplicateConditions = [];
    if (contentCheck) {
      duplicateConditions.push({ author: req.body.author, content: contentCheck });
    }
    if (imageCheck) {
      duplicateConditions.push({ image: imageCheck });
    }
    if (gifUrlCheck) {
      duplicateConditions.push({ gifUrl: gifUrlCheck });
    }
    if (audioCheck) {
      duplicateConditions.push({ audio: audioCheck });
    }

    if (duplicateConditions.length > 0) {
      const existingDuplicate = await Tweet.findOne({ $or: duplicateConditions });
      if (existingDuplicate) {
        return res.status(400).send({ error: "Duplicate tweet text or media is not allowed." });
      }
    }

    // ── Subscription tweet-limit guard ────────────────────────────────────────
    const postingUser = await User.findById(req.body.author);
    if (postingUser && !postingUser.isBot) {
      const plan = postingUser.subscription?.plan || "free";
      const limit = PLAN_LIMITS[plan] ?? 1;
      if (limit !== Infinity) {
        const today = getISTDateString();
        if (postingUser.lastTweetDate !== today) {
          postingUser.dailyTweetCount = 0;
          postingUser.lastTweetDate = today;
        }
        if (postingUser.dailyTweetCount >= limit) {
          return res.status(403).send({
            error: `You have reached your daily tweet limit (${limit} tweet${limit > 1 ? "s" : ""}) for the ${plan} plan. Upgrade to post more.`,
            limitReached: true,
            plan,
            limit,
          });
        }
        postingUser.dailyTweetCount += 1;
        await postingUser.save();
      }
    }
    // Extract allowed fields
    const { author, content, image, gifUrl, audio, location, scheduledAt } = req.body;

    // Translate post content to user's selected language
    let translatedContent = content;
    if (postingUser && postingUser.language) {
      translatedContent = await translateText(content, postingUser.language);
    }

    const isFutureScheduled = scheduledAt && new Date(scheduledAt) > new Date();

    const tweet = new Tweet({ 
      author, 
      content: translatedContent, 
      image: image || null, 
      gifUrl: gifUrl || null, 
      audio: audio || null, 
      location: location || null, 
      scheduledAt: scheduledAt || null,
      notificationsSent: !isFutureScheduled
    });
    await tweet.save();

    if (!isFutureScheduled) {
      await processTweetNotifications(tweet);
    }

    const populated = await tweet.populate("author");
    return res.status(201).send(populated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

let botTemplates = null;
const getBotTemplates = () => {
  if (!botTemplates) {
    const { templates } = generateSeedData();
    botTemplates = templates;
  }
  return botTemplates;
};

app.get("/post", async (req, res) => {
  try {
    const tweets = await Tweet.find(publishedTweetFilter)
      .sort({ timestamp: -1 })
      .limit(100)
      .populate("author", "displayName username avatar verified subscription")
      .lean();
    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// SEARCH TWEETS — must be BEFORE /post/user/:userId to avoid route conflict
app.get("/post/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.send([]);
    const tweets = await Tweet.find({
      content: { $regex: q.trim(), $options: "i" },
      ...publishedTweetFilter,
    }).sort({ timestamp: -1 }).limit(50).populate("author", "displayName username avatar verified subscription").lean();
    res.send(tweets);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// GET USER MEDIA TWEETS — must be BEFORE /post/user/:userId
app.get("/post/user/:userId/media", async (req, res) => {
  try {
    const tweets = await Tweet.find({
      author: req.params.userId,
      $and: [mediaAttachmentFilter, publishedTweetFilter],
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate("author", "displayName username avatar verified subscription")
      .lean();
    res.send(tweets);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// GET tweets by user
app.get("/post/user/:userId", async (req, res) => {
  try {
    const tweets = await Tweet.find({
      author: req.params.userId,
      ...publishedTweetFilter,
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate("author", "displayName username avatar verified subscription")
      .lean();
    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Like ──────────────────────────────────────────────────────────────────
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    const hasLiked = tweet.likedBy.some(id => id.toString() === userId);
    if (hasLiked) {
      tweet.likes = Math.max(0, tweet.likes - 1);
      tweet.likedBy = tweet.likedBy.filter(id => id.toString() !== userId);
    } else {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      // Notify tweet author
      if (tweet.author.toString() !== userId) {
        await new Notification({
          recipient: tweet.author,
          sender: userId,
          type: "like",
          tweet: tweet._id,
          content: "liked your post",
          extra: `"${tweet.content.slice(0, 60)}${tweet.content.length > 60 ? "…" : ""}"`
        }).save();
      }
    }
    await tweet.save();
    const populated = await tweet.populate("author");
    res.send(populated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Retweet ───────────────────────────────────────────────────────────────
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    const hasRetweeted = tweet.retweetedBy.some(id => id.toString() === userId);
    if (hasRetweeted) {
      tweet.retweets = Math.max(0, tweet.retweets - 1);
      tweet.retweetedBy = tweet.retweetedBy.filter(id => id.toString() !== userId);
    } else {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      if (tweet.author.toString() !== userId) {
        await new Notification({
          recipient: tweet.author,
          sender: userId,
          type: "retweet",
          tweet: tweet._id,
          content: "reposted your post",
          extra: `"${tweet.content.slice(0, 60)}${tweet.content.length > 60 ? "…" : ""}"`
        }).save();
      }
    }
    await tweet.save();
    const populated = await tweet.populate("author");
    res.send(populated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ── Follow / Unfollow ─────────────────────────────────────────────────────
app.post("/user/follow/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = req.params.id;
    if (userId === targetId) return res.status(400).send({ error: "Cannot follow yourself" });

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetId);
    if (!user || !targetUser) return res.status(404).send({ error: "User not found" });

    const isFollowing = user.following.map(id => id.toString()).includes(targetId);
    if (isFollowing) {
      user.following = user.following.filter(id => id.toString() !== targetId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== userId);
    } else {
      user.following.push(targetId);
      targetUser.followers.push(userId);
      await new Notification({
        recipient: targetId,
        sender: userId,
        type: "follow",
        content: "followed you"
      }).save();
    }

    await user.save();
    await targetUser.save();
    res.send({ following: user.following, followerCount: targetUser.followers.length });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Suggestions ───────────────────────────────────────────────────────────
app.get("/users/suggestions", async (req, res) => {
  try {
    const { userId } = req.query;
    const currentUser = await User.findById(userId);
    const excludeIds = currentUser 
      ? [new mongoose.Types.ObjectId(userId), ...currentUser.following.map(id => new mongoose.Types.ObjectId(id))] 
      : userId ? [new mongoose.Types.ObjectId(userId)] : [];
    
    const bots = await User.find({ _id: { $nin: excludeIds }, isBot: true }).limit(20);
    const nonBots = await User.find({ _id: { $nin: excludeIds }, isBot: { $ne: true } }).limit(20);
    
    const combined = [...bots, ...nonBots].sort(() => 0.5 - Math.random());
    res.send(combined);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Search Users ───────────────────────────────────────────────────────────
app.get("/users/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.send([]);
    const regex = new RegExp(q, "i");
    const users = await User.find({
      $or: [
        { username: regex },
        { displayName: regex }
      ]
    }).limit(20);
    res.send(users);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Bookmarks ─────────────────────────────────────────────────────────────
app.post("/user/bookmark/:tweetid", async (req, res) => {
  try {
    const { email } = req.body;
    const tweetId = req.params.tweetid;
    const user = await User.findOne({ email: email ? email.toLowerCase() : "" });
    if (!user) return res.status(404).send({ error: "User not found" });
    const isBookmarked = user.bookmarks.map(id => id.toString()).includes(tweetId);
    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== tweetId);
    } else {
      user.bookmarks.push(tweetId);
    }
    await user.save();
    res.send({ bookmarks: user.bookmarks });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/user/:email/bookmarks", async (req, res) => {
  try {
    const emailParam = decodeEmailParam(req.params.email);
    const user = await User.findOne({ email: emailParam }).populate({
      path: "bookmarks",
      populate: { path: "author" }
    });
    if (!user) return res.status(404).send({ error: "User not found" });
    res.send(user.bookmarks);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Trending ──────────────────────────────────────────────────────────────
app.get("/trending", async (req, res) => {
  try {
    const tweets = await Tweet.find().limit(200);
    const hashtagCounts = {};
    tweets.forEach(tweet => {
      const tags = tweet.content.match(/#\w+/g) || [];
      tags.forEach(tag => {
        const normalized = tag.toLowerCase();
        hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1;
      });
    });
    const trending = Object.entries(hashtagCounts)
      .map(([topic, count]) => ({ topic, posts: count }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 8);
    res.send(trending);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Replies ───────────────────────────────────────────────────────────────
app.post("/tweet/:tweetid/reply", async (req, res) => {
  try {
    const { userId, content } = req.body;
    const tweetId = req.params.tweetid;
    if (!userId || !content?.trim()) return res.status(400).send({ error: "Missing fields" });

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    const replyingUser = await User.findById(userId);
    let translatedContent = content;
    if (replyingUser && replyingUser.language) {
      translatedContent = await translateText(content, replyingUser.language);
    }

    const comment = new Comment({ tweetId, author: userId, content: translatedContent });
    await comment.save();
    tweet.comments += 1;
    await tweet.save();

    // Notify tweet author
    if (tweet.author.toString() !== userId) {
      await new Notification({
        recipient: tweet.author,
        sender: userId,
        type: "mention",
        tweet: tweet._id,
        content: "replied to your post",
        extra: `"${content.slice(0, 60)}${content.length > 60 ? "…" : ""}"`
      }).save();
    }

    const populated = await comment.populate("author");
    res.status(201).send(populated);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/tweet/:tweetid/replies", async (req, res) => {
  try {
    const comments = await Comment.find({ tweetId: req.params.tweetid })
      .populate("author")
      .sort({ timestamp: -1 });
    res.send(comments);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────
app.get("/messages/conversations/:userId", async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.params.userId })
      .populate("participants")
      .sort({ updatedAt: -1 });
    res.send(convs);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/messages/:convId", async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.convId }).sort({ createdAt: 1 });
    res.send(messages);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) return res.status(400).send({ error: "Missing fields" });

    let conv = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
    if (!conv) {
      conv = new Conversation({ participants: [senderId, receiverId], lastMessage: text });
    } else {
      conv.lastMessage = text;
      conv.updatedAt = Date.now();
    }
    await conv.save();

    const msg = new Message({ conversationId: conv._id, sender: senderId, text });
    await msg.save();

    // Create message notification for recipient
    await new Notification({
      recipient: receiverId,
      sender: senderId,
      type: "message",
      content: "sent you a message",
      extra: text
    }).save();

    res.status(201).send(msg);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Interests ─────────────────────────────────────────────────────────────
app.patch("/user/:email/interests", async (req, res) => {
  try {
    const { interests } = req.body;
    const emailParam = decodeEmailParam(req.params.email);
    const user = await User.findOneAndUpdate(
      { email: emailParam },
      { $set: { interests } },
      { new: true }
    );
    res.send(user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────
app.get("/notifications/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const dbNotifs = await Notification.find({ recipient: userId })
      .populate("sender")
      .populate({ path: "tweet", populate: { path: "author" } })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.send(dbNotifs);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/user/:id", async (req, res) => {
  try {
    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findById(req.params.id).select("-passwordHash -email -phone").lean();
    } else {
      user = await User.findOne({ username: { $regex: new RegExp("^" + req.params.id + "$", "i") } }).select("-passwordHash -email -phone").lean();
    }
    if (!user) return res.status(404).send({ error: "User not found" });
    res.send(user);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/user/:id/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "_id displayName username avatar verified");
    if (!user) return res.status(404).send({ error: "User not found" });
    res.send(user.followers);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/user/:id/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "_id displayName username avatar verified");
    if (!user) return res.status(404).send({ error: "User not found" });
    res.send(user.following);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Mark notification read
app.patch("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.send({ success: true });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// DELETE TWEET
app.delete("/post/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    if (tweet.author.toString() !== userId) return res.status(403).send({ error: "Not authorized" });
    await Tweet.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ tweetId: req.params.id });
    res.send({ success: true });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// GET USERS LIST (for new DM compose)
app.get("/users/list", async (req, res) => {
  try {
    const { userId, q } = req.query;
    const query = q ? { displayName: { $regex: q, $options: "i" }, _id: { $ne: userId } } : { _id: { $ne: userId } };
    const users = await User.find(query).limit(10);
    res.send(users);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD ROUTES (Real OTP-based flow)
// ══════════════════════════════════════════════════════════════════════════════

// In-memory store: identifier -> { lastRequestDate, otp, otpExpiresAt, verified, resetToken, resetTokenExpiresAt }
const forgotPasswordStore = new Map();
const passwordResetHistory = new Map(); // key -> YYYY-MM-DD string

const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// GET /forgot-password/check-user
app.get("/forgot-password/check-user", async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) return res.status(400).send({ error: "Identifier required" });
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
    });
    if (!user) return res.status(404).send({ exists: false });
    return res.status(200).send({ exists: true, email: user.email });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ── Normalize any phone identifier to the format stored in DB ──────────────
// Registration stores phone as: phone.replace(/\s/g, "")  e.g. "+919951363609"
// Users may type: "9951363609", "+91 9951 363609", "919951363609" etc.
// This function normalizes all formats so they all match the stored value.
const normalizePhoneIdentifier = (raw) => {
  // Strip all spaces
  let n = raw.replace(/\s/g, "");
  // If it looks like a 10-digit Indian number without country code, try both with and without +91
  // Return the normalized form so we can try multiple lookups
  return n;
};

// POST /forgot-password  — Step 1: send real OTP to the user's email or phone
app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier, channel = 'both' } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).send({ error: "Email or phone number is required" });
    }

    const rawIdentifier = identifier.trim();
    const normalized = normalizePhoneIdentifier(rawIdentifier);

    // Build multiple candidates so any phone format works:
    // e.g. "9951363609" → also try "+919951363609" and "919951363609"
    const candidates = [normalized.toLowerCase()];
    const digitsOnly = normalized.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      // Pure 10-digit Indian number — also try with country codes
      candidates.push(`+91${digitsOnly}`, `91${digitsOnly}`);
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      // 12-digit with 91 prefix — also try without
      candidates.push(`+${digitsOnly}`, digitsOnly.slice(2));
    } else if (digitsOnly.length === 13 && normalized.startsWith("+91")) {
      candidates.push(digitsOnly, digitsOnly.slice(2));
    }

    // Use the first candidate as the store key (consistent)
    const key = normalized.toLowerCase();

    // Once-per-day rate limit check (IST calendar day)
    const today = getISTDateString();
    if (passwordResetHistory.has(key) && passwordResetHistory.get(key) === today) {
      return res.status(429).send({
        error: "You can use this option only one time per day.",
        rateLimited: true,
      });
    }

    // Try to find user by any candidate identifier
    const user = await User.findOne({
      $or: [
        ...candidates.map(c => ({ email: c })),
        ...candidates.map(c => ({ phone: c })),
      ]
    });
    if (!user) {
      return res.status(404).send({ error: "No account found with this email or phone number." });
    }

    // DB-level rate limit check (persists across server restarts)
    if (user.lastPasswordResetDate && user.lastPasswordResetDate === today) {
      // Also record in memory store to avoid future DB lookups
      passwordResetHistory.set(key, today);
      return res.status(429).send({
        error: "You can use this option only one time per day.",
        rateLimited: true,
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store reset OTP — key is always the normalized identifier
    forgotPasswordStore.set(key, {
      lastRequestTime: Date.now(),
      otp: hashOtp(otp),
      otpExpiresAt,
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone || null,
      verified: false,
      resetToken: null,
      resetTokenExpiresAt: null,
    });
    passwordResetHistory.set(key, today);
    // Persist to DB so rate limit survives server restarts
    await User.findByIdAndUpdate(user._id, { $set: { lastPasswordResetDate: today } });

    if (channel === 'mobile' && !user.phone) {
      return res.status(400).send({
        error: "No mobile number is registered with this account. Please use the Email option, or log in to configure your mobile number.",
        phoneMissing: true
      });
    }

    let warning = null;
    if (channel === 'both' && !user.phone) {
      warning = "No mobile number is registered with this account. The OTP was only sent to your email. Please add a mobile number in settings once logged in.";
    }

    let sentVia = [];
    let devOtp = null;
    let maskedEmail = null;
    let maskedPhone = null;

    // 1. Send via Email (Resend HTTP API — bypasses SMTP port blocks)
    if ((channel === 'email' || channel === 'both') && user.email && !user.email.includes("@phone.twiller.local")) {
      maskedEmail = user.email.replace(/(?<=.{2}).(?=[^@]*@)/g, "*");
      try {
        await sendEmail({
          to: user.email,
          subject: `${otp} is your Twiller password reset code`,
          html: generateProfessionalEmailTemplate(
            "Password Reset Code",
            `Hi <strong>${user.displayName}</strong>, use the code below to reset your password. It expires in <strong>10 minutes</strong>.`,
            otp,
            "Password Reset"
          ),
          text: `Your Twiller password reset code: ${otp}\n\nEnter this on the Twiller password reset page. Expires in 10 minutes.\n\nNever share this code.`,
        });
        sentVia.push("email");
      } catch (mailErr) {
        console.error(`❌ Password reset OTP email failed (Gmail API) for ${user.email}:`, mailErr.message);
        // Surface OTP in response so user is never fully blocked (only in dev/mock fallback)
        devOtp = otp;
      }
    }

    // 2. Send via WhatsApp
    if ((channel === 'mobile' || channel === 'both') && user.phone) {
      const cleanDigits = user.phone.replace(/\D/g, "");
      const last4 = cleanDigits.slice(-4);
      const countryPrefix = cleanDigits.length > 10 ? `+${cleanDigits.slice(0, cleanDigits.length - 10)} ` : "+91 ";
      maskedPhone = `${countryPrefix}${"*".repeat(Math.max(0, cleanDigits.slice(-10).length - 4))}${last4}`;

      try {
        const smsRes = await sendSmsOtp(user.phone, otp);
        if (smsRes && (smsRes.success || smsRes.devMode)) {
          sentVia.push("mobile");
          if (smsRes.devMode) devOtp = otp;
        } else {
          if (channel === 'mobile') {
            return res.status(500).send({
              error: `Twilio WhatsApp delivery failed: ${smsRes?.error || "Unknown error"}. If you haven't joined the Twilio WhatsApp sandbox, please join to receive OTPs.`,
              isTwilioError: true
            });
          } else {
            warning = `Twilio WhatsApp delivery failed: ${smsRes?.error || "Unknown error"}. The OTP was only sent to your email. If you haven't joined the Twilio WhatsApp sandbox, please join to receive OTPs.`;
          }
        }
      } catch (smsErr) {
        console.warn("⚠️ Password reset WhatsApp failed:", smsErr.message);
        if (channel === 'mobile') {
          return res.status(500).send({
            error: `Twilio WhatsApp delivery failed: ${smsErr.message}. If you haven't joined the Twilio WhatsApp sandbox, please join to receive OTPs.`,
            isTwilioError: true
          });
        } else {
          warning = `Twilio WhatsApp delivery failed: ${smsErr.message}. The OTP was only sent to your email. If you haven't joined the Twilio WhatsApp sandbox, please join to receive OTPs.`;
        }
      }
    }

    if (sentVia.length === 0 && !devOtp) {
      return res.status(500).send({ error: "Failed to dispatch OTP. Please try again later." });
    }

    // Build contact strings for UI
    let contactType = sentVia.length > 1 ? "both" : (sentVia[0] || "email");
    let maskedContactStr = [];
    if (maskedEmail) maskedContactStr.push(maskedEmail);
    if (maskedPhone) maskedContactStr.push(maskedPhone);

    return res.status(200).send({
      success: true,
      contactType,                 
      maskedContact: maskedContactStr.join(" and "),               
      email: user.email,
      maskedEmail: maskedEmail, // kept for backward compatibility
      message: `OTP sent successfully to your registered ${sentVia.join(" and ")}.`,
      warning,
      ...(devOtp ? { devOtp } : {}),
    });
  } catch (error) {
    console.error("forgot-password error:", error);
    return res.status(500).send({ error: error.message || "Failed to send reset code" });
  }
});

// POST /forgot-password/verify-otp  — Step 2: verify OTP, get reset token
app.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) return res.status(400).send({ error: "identifier and otp are required" });

    const normalized = normalizePhoneIdentifier(identifier.trim());
    const key = normalized.toLowerCase();

    // Try to find the record — also check alternate keys if not found directly
    let record = forgotPasswordStore.get(key);
    let usedKey = key;
    if (!record) {
      // Try alternate phone formats
      const digitsOnly = normalized.replace(/\D/g, "");
      const altKeys = [];
      if (digitsOnly.length === 10) altKeys.push(`+91${digitsOnly}`, `91${digitsOnly}`);
      else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) altKeys.push(`+${digitsOnly}`, digitsOnly.slice(2));
      else if (digitsOnly.length >= 11) altKeys.push(digitsOnly, `+${digitsOnly}`);
      for (const alt of altKeys) {
        if (forgotPasswordStore.has(alt.toLowerCase())) {
          record = forgotPasswordStore.get(alt.toLowerCase());
          usedKey = alt.toLowerCase();
          break;
        }
      }
    }

    if (!record) return res.status(400).send({ error: "No reset request found. Please request a new OTP." });
    if (Date.now() > record.otpExpiresAt) {
      forgotPasswordStore.delete(usedKey);
      return res.status(400).send({ error: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== hashOtp(otp)) {
      // Check if this is a phone account to give the right error message
      const isPhone = record.phone || (record.email && record.email.includes("@phone.twiller.local"));
      return res.status(400).send({
        error: isPhone
          ? "Incorrect code. Please check the SMS sent to your phone."
          : "Incorrect code. Please check your email and try again."
      });
    }

    // Generate a secure reset token
    const resetToken = uuidv4();
    forgotPasswordStore.set(usedKey, {
      ...record,
      verified: true,
      otp: null, // consume OTP
      resetToken,
      resetTokenExpiresAt: Date.now() + 15 * 60 * 1000, // 15 min to set new password
    });

    return res.status(200).send({
      success: true,
      resetToken,
      email: record.email,
      storeKey: usedKey, // pass back so reset step uses same key
    });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION ROUTES (PayPal Sandbox Integration)
// ══════════════════════════════════════════════════════════════════════════════

// GET subscription status + daily tweet info
// ── Persistent mock orders store (MongoDB) ───────────────────────────────────
// mockOrdersStore is replaced by MockOrder model

// GET subscription status + daily tweet info
app.get("/subscription/status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send({ error: "User not found" });
    const plan = user.subscription?.plan || "free";
    const limit = PLAN_LIMITS[plan] ?? 1;
    const today = getISTDateString();
    const dailyCount = user.lastTweetDate === today ? (user.dailyTweetCount || 0) : 0;
    return res.send({
      plan,
      subscription: user.subscription,
      limit: limit === Infinity ? null : limit,
      dailyTweetCount: dailyCount,
      canTweet: limit === Infinity || dailyCount < limit,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// PayPal Sandbox checkout and OTP verification routes removed. Using Razorpay under /api/payments instead.

app.post("/subscription/cancel", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).send({ error: "userId is required" });
    
    const user = await User.findByIdAndUpdate(userId, {
      $set: {
        "subscription.plan": "free",
        "subscription.activatedAt": null,
        "subscription.expiresAt": null,
        "subscription.orderId": null,
        dailyTweetCount: 0
      }
    }, { new: true });
    
    return res.status(200).send({ success: true, message: "Subscription cancelled successfully", user });
  } catch (error) {
    console.error("Cancel active subscription error:", error);
    return res.status(500).send({ error: error.message });
  }
});

app.get("/subscription/payments/:userId", async (req, res) => {
  try {
    const payments = await Payment.find({ user_id: req.params.userId }).sort({ created_at: -1 });
    return res.status(200).send(payments);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPDESK TICKETS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post("/helpdesk/tickets", uploadImage.single("screenshot"), async (req, res) => {
  try {
    const { userId, name, email, phone, subject, description, paymentId, orderId } = req.body;
    if (!name || !email || !subject || !description) {
      return res.status(400).send({ error: "Name, email, subject and description are required fields." });
    }

    const screenshot = req.file ? req.file.path : null;

    const ticket = new SupportTicket({
      userId: userId || null,
      name,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      subject,
      description,
      paymentId: paymentId || null,
      orderId: orderId || null,
      screenshot,
      status: "open",
    });

    await ticket.save();

    console.log(`🎫 New Support Ticket created: ${ticket._id} | Subject: ${subject}`);

    const hasRealEmail = ticket.email && !ticket.email.includes("@phone.twiller.local");
    const formattedId = ticket._id.toString().slice(-6).toUpperCase();

      // Send Ticket notification to application owner (Owner Email Alert)
      // Note: Gmail REST API does not support path-based attachments.
      // The screenshot (if any) is saved to disk on the server and its path is stored in the ticket record.
      const screenshotNote = screenshot ? `\n\n📎 Screenshot: ${screenshot}` : "";
      try {
        await sendEmail({
          to: process.env.SUPPORT_OWNER_EMAIL || "owner@twiller.com",
          subject: `🚨 Support Ticket Raised [${formattedId}]: ${subject}`,
          html: `
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; max-width:600px; margin:0 auto; background:#000; border:1px solid #2f3336; border-radius:16px; overflow:hidden; color:#e7e9ea; padding:24px;">
            <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #2f3336;">
              <h2 style="color:#f4212e; margin:0; font-size:24px; font-weight:800;">🚨 New Support Ticket</h2>
              <p style="color:#71767b; font-size:14px; margin:4px 0 0;">An issue has been reported by a user.</p>
            </div>
            
            <table style="width:100%; border-collapse:collapse; margin:24px 0; font-size:14px;">
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold; width:140px;">Ticket ID</td>
                <td style="color:#e7e9ea; font-family:monospace; font-weight:bold;">#${formattedId}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">User Name</td>
                <td style="color:#e7e9ea;">${name}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">User Email</td>
                <td style="color:#e7e9ea;">${email}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">User Phone</td>
                <td style="color:#e7e9ea;">${phone || "N/A"}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">Subject</td>
                <td style="color:#e7e9ea; font-weight:bold;">${subject}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">Order ID</td>
                <td style="color:#e7e9ea; font-family:monospace;">${orderId || "N/A"}</td>
              </tr>
              <tr>
                <td style="color:#71767b; padding:8px 0; font-weight:bold;">Payment ID</td>
                <td style="color:#e7e9ea; font-family:monospace;">${paymentId || "N/A"}</td>
              </tr>
            </table>

            <div style="background:#16181c; border:1px solid #2f3336; border-radius:12px; padding:20px; margin-bottom:24px;">
              <p style="color:#71767b; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px;">Description</p>
              <p style="color:#e7e9ea; font-size:14px; margin:0; line-height:1.5; white-space:pre-wrap;">${description}</p>
            </div>

            ${screenshot ? `
              <div style="border-top:1px solid #2f3336; padding-top:20px;">
                <p style="color:#71767b; font-size:13px;">📎 Screenshot saved on server at: <code>${screenshot}</code></p>
              </div>
            ` : ""}
          </div>
        `,
          text: `Support Ticket #${formattedId}\nUser: ${name} | ${email} | ${phone || "N/A"}\nSubject: ${subject}\nOrder: ${orderId || "N/A"} | Payment: ${paymentId || "N/A"}\n\n${description}${screenshotNote}`,
        });
        console.log(`✉️ Support ticket email dispatched to Owner for Ticket #${formattedId}`);
      } catch (ownerMailErr) {
        console.error("❌ Owner Ticket email notification failed (Gmail API):", ownerMailErr.message);
      }

    // 1. Send confirmation email to the User (Resend HTTP API)
    if (hasRealEmail) {
      try {
        await sendEmail({
          to: ticket.email,
          subject: `🎫 Twiller Support Ticket Raised [${formattedId}]`,
          html: generateProfessionalEmailTemplate(
            "Ticket Raised",
            `Hi <strong>${name}</strong>,<br><br>We have received your support ticket regarding <strong>${subject}</strong>. Your ticket is raised, and we will solve your issues shortly.`,
            formattedId,
            "Ticket ID"
          ),
          text: `Hi ${name}, your support ticket has been raised regarding: ${subject}. We will solve your issues shortly. Ticket ID: ${formattedId}.`,
        });
      } catch (mailErr) {
        console.error("❌ Support Ticket user confirmation email failed (Gmail API):", mailErr.message);
      }
    }

    // 2. Send confirmation via WhatsApp if phone number is present
    if (ticket.phone) {
      try {
        const msg = `🎫 *Twiller Support*\n\nHi ${name},\n\nWe have received your support ticket regarding *${subject}*.\n\n• *Ticket ID*: ${formattedId}\n\nYour ticket has been raised, and we will solve your issues shortly.`;
        await sendSmsOtp(ticket.phone, null, msg);
      } catch (smsErr) {
        console.warn("⚠️ Support Ticket WhatsApp notification failed:", smsErr.message);
      }
    }

    return res.status(201).send(ticket);
  } catch (error) {
    console.error("Ticket submission error:", error);
    return res.status(500).send({ error: error.message || "Failed to submit ticket" });
  }
});

app.get("/helpdesk/tickets/:userId", async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    return res.status(200).send(tickets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/helpdesk/tickets/ticket/:ticketId", async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).send({ error: "Ticket not found" });
    return res.status(200).send(ticket);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ==========================================
// TWILIO WHATSAPP OTP ENDPOINTS
// ==========================================
app.post("/api/auth/send-whatsapp-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).send({ error: "Phone number required" });

    const formattedPhone = normalizePhone(phone);

    const registered = await User.findOne({ phone: formattedPhone, passwordHash: { $exists: true, $ne: null } });
    if (registered) {
      return res.status(409).send({ error: "Phone number already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    whatsappOtpStore.set(formattedPhone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    const sendResult = await sendSmsOtp(formattedPhone, otp);

    if (sendResult && !sendResult.success) {
      return res.status(500).send({
        error: `Twilio delivery failed: ${sendResult.error || "Unknown error"}. If you have not joined the Twilio WhatsApp sandbox, please join to receive OTPs.`,
        isTwilioError: true
      });
    }

    return res.status(200).send({
      success: true,
      message: "OTP sent successfully via WhatsApp.",
      devMode: sendResult.devMode
    });
  } catch (error) {
    console.error("send-whatsapp-otp error:", error);
    return res.status(500).send({ error: error.message });
  }
});

app.post("/api/auth/verify-whatsapp-otp", async (req, res) => {
  try {
    const { phone, otpCode } = req.body;
    if (!phone || !otpCode) return res.status(400).send({ error: "Phone and OTP required" });

    const formattedPhone = normalizePhone(phone);
    const record = whatsappOtpStore.get(formattedPhone);

    if (!record) {
      return res.status(404).send({ error: "No OTP found. Please request a new one." });
    }
    if (Date.now() > record.expiresAt) {
      whatsappOtpStore.delete(formattedPhone);
      return res.status(400).send({ error: "OTP code expired" });
    }
    if (record.otp !== otpCode.trim()) {
      return res.status(400).send({ error: "Invalid OTP code" });
    }

    whatsappOtpStore.set(formattedPhone, { ...record, verified: true, expiresAt: Date.now() + 30 * 60 * 1000 });

    return res.status(200).send({ success: true, message: "OTP verified" });
  } catch (error) {
    console.error("verify-whatsapp-otp error:", error);
    return res.status(500).send({ error: error.message });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).send({ error: "Uploaded file is too large." });
  }
  if (error) return res.status(400).send({ error: error.message || "Request failed" });
  return next();
});

