/**
 * gmailTransport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production Gmail email transport using the Gmail REST API (googleapis).
 *
 * WHY THIS EXISTS:
 *   Render Free Tier blocks outbound TCP on ports 25, 465, and 587 at the
 *   network layer. Gmail App Password + Nodemailer SMTP uses those ports and
 *   will always throw ENETUNREACH there. App Passwords are SMTP-only credentials
 *   and cannot authenticate the REST API.
 *
 *   This module uses the Gmail REST API endpoint:
 *     POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
 *   which runs over HTTPS (port 443) and is never blocked.
 *
 * HOW IT AUTHENTICATES:
 *   OAuth2 with a long-lived refresh token. The googleapis library
 *   automatically exchanges the refresh token for a short-lived access token
 *   on every call — zero maintenance required after initial setup.
 *
 * REQUIRED ENVIRONMENT VARIABLES (set in Render Dashboard → Environment):
 *   GMAIL_USER          = your.address@gmail.com
 *   GMAIL_CLIENT_ID     = 1234567890-abc...apps.googleusercontent.com
 *   GMAIL_CLIENT_SECRET = GOCSPX-...
 *   GMAIL_REFRESH_TOKEN = 1//0g...  (from OAuth Playground — never expires)
 *
 * ONE-TIME SETUP (takes ~5 minutes):
 *   1. Go to https://console.cloud.google.com → New Project → APIs & Services
 *      → Enable APIs → search "Gmail API" → Enable.
 *   2. OAuth consent screen → External → fill name/email → Add scope:
 *      https://www.googleapis.com/auth/gmail.send
 *   3. Credentials → Create Credentials → OAuth 2.0 Client ID → Web app.
 *      Authorized redirect URI: https://developers.google.com/oauthplayground
 *      Save CLIENT_ID and CLIENT_SECRET.
 *   4. Go to https://developers.google.com/oauthplayground
 *      → Gear icon → check "Use your own OAuth credentials" → paste CLIENT_ID
 *      and CLIENT_SECRET → Authorize API → paste scope:
 *      https://www.googleapis.com/auth/gmail.send → Authorize → Exchange for
 *      tokens → copy the "Refresh token" → save as GMAIL_REFRESH_TOKEN.
 */

import { google } from "googleapis";
import crypto from "crypto";

// ── OAuth2 client — initialized once at startup ────────────────────────────
let _gmailClient = null;

export function initGmailTransport() {
  const { GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } =
    process.env;

  if (!GMAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return null; // caller decides whether to warn/mock
  }

  try {
    const oauth2 = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // redirect_uri must match Cloud Console
    );
    oauth2.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

    _gmailClient = google.gmail({ version: "v1", auth: oauth2 });
    console.log(`✅ Gmail REST API transport initialized for ${GMAIL_USER}`);
    return _gmailClient;
  } catch (err) {
    console.error("❌ Gmail REST API transport init failed:", err.message);
    return null;
  }
}

/**
 * Builds an RFC 2822 MIME multipart/alternative message and returns it
 * as a base64url-encoded string suitable for the Gmail API's `raw` field.
 *
 * @param {object} opts
 * @param {string} opts.from    - "Display Name <address@gmail.com>"
 * @param {string} opts.to      - recipient email address
 * @param {string} opts.subject - email subject
 * @param {string} [opts.html]  - HTML body (preferred)
 * @param {string} [opts.text]  - plain-text body (fallback)
 * @returns {string} base64url-encoded RFC 2822 message
 */
export function buildRawMimeMessage({ from, to, subject, html, text }) {
  const boundary = `twiller_mime_${crypto.randomBytes(10).toString("hex")}`;

  const plainPart = text || "Please view this email in an HTML-capable email client.";
  const htmlPart  = html || `<pre>${plainPart}</pre>`;

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    plainPart,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlPart,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * sendViaGmailAPI
 * ───────────────
 * Sends an email through the Gmail REST API (HTTPS port 443).
 * Throws on failure so the caller can log and handle appropriately.
 *
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 * @returns {Promise<{ id: string, threadId: string, labelIds: string[] }>}
 */
export async function sendViaGmailAPI({ to, subject, html, text }) {
  if (!_gmailClient) {
    throw new Error("Gmail REST API client is not initialized. Check GMAIL_* env vars.");
  }

  const from = `"Twiller" <${process.env.GMAIL_USER}>`;
  const raw  = buildRawMimeMessage({ from, to, subject, html, text });

  try {
    const response = await _gmailClient.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    const { id, threadId } = response.data;
    console.log(
      `✉️  Gmail REST API → delivered to ${to} [msgId: ${id}, threadId: ${threadId}]`
    );
    return response.data;
  } catch (err) {
    // Surface the inner Google API error message if available
    const apiError  = err?.response?.data?.error;
    const apiMsg    = apiError
      ? `${apiError.code} ${apiError.status}: ${apiError.message}`
      : err.message;

    console.error(`❌ Gmail REST API send failed for ${to}: ${apiMsg}`);

    // Specific guidance for common errors
    if (apiError?.code === 401 || apiError?.status === "UNAUTHENTICATED") {
      console.error(
        "   → Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN. " +
        "The refresh token may have been revoked — re-run the OAuth Playground flow."
      );
    } else if (apiError?.code === 403) {
      console.error(
        "   → The Gmail API may not be enabled in your Google Cloud project, or " +
        "the OAuth scope 'https://www.googleapis.com/auth/gmail.send' was not granted."
      );
    } else if (apiError?.code === 429) {
      console.error("   → Gmail API rate limit hit. Back off and retry.");
    }

    throw new Error(apiMsg);
  }
}
