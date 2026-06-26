import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/payment.js";
import User from "../models/user.js";
import { allowMockPayments, assertRequiredEnv } from "../config/runtime.js";

const PLAN_PRICES = { free: 0, bronze: 100, silver: 300, gold: 1000 };

// ── Payment time window: 10:00 AM – 11:00 AM IST ─────────────────────────────
const PAYMENT_WINDOW_START = 10 * 60; // 10:00 AM in minutes
const PAYMENT_WINDOW_END   = 11 * 60; // 11:00 AM in minutes

const isWithinPaymentWindow = () => {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % (24 * 60);
  return istMinutes >= PAYMENT_WINDOW_START && istMinutes < PAYMENT_WINDOW_END;
};


let razorpay;
const getRazorpayInstance = () => {
  if (!razorpay) {
    assertRequiredEnv(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]);
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    razorpay = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpay;
};

export const createOrder = async (req, res) => {
  try {
    console.log("Create order called! Body:", req.body);
    const { userId, plan } = req.body;
    if (!userId || !plan) return res.status(400).send({ error: "userId and plan are required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    if (!PLAN_PRICES[plan] && plan !== "free") {
        return res.status(400).send({ error: "Invalid plan selected" });
    }

    const amountInINR = PLAN_PRICES[plan];
    const amountInPaise = amountInINR * 100;

    // ── Payment time window enforcement (10:00 AM – 11:00 AM IST) ────────────
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        error: "Payments are only accepted between 10:00 AM and 11:00 AM IST. Please try again during this window.",
        timeRestricted: true,
      });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${userId.toString().slice(-6)}_${Date.now().toString().slice(-8)}`
    };

    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let order;
    let isMock = false;

    if (!rzpKeyId || !rzpKeySecret || rzpKeyId === "dummy" || rzpKeyId.includes("dummy")) {
      isMock = true;
    }

    if (isMock && !allowMockPayments()) {
      return res.status(503).json({
        error: "Payments are unavailable until Razorpay credentials are configured.",
      });
    }

    if (!isMock) {
      try {
        const rzp = getRazorpayInstance();
        order = await rzp.orders.create(options);
      } catch (err) {
        console.warn("⚠️ Razorpay SDK call failed, falling back to mock mode:", err.message);
        isMock = true;
      }
    }

    if (isMock) {
      const mockId = `mock_rzp_order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      order = { id: mockId };
    }

    await Payment.create({
      user_id: userId,
      razorpay_order_id: order.id,
      amount: amountInINR,
      currency: "INR",
      status: "PENDING"
    });

    res.status(200).json({
      orderId: order.id,
      amount: amountInINR,
      planName: plan,
      userEmail: user.email,
      userPhone: user.phone || "",
      keyId: isMock ? "rzp_mock_key_id" : rzpKeyId,
      isMock: isMock
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
};

const sendPaymentNotification = async (req, user, plan, amount, orderId, paymentId, status, failureReason = "") => {
  try {
    const planName = plan.toUpperCase();
    const sendEmail = req.app.get("sendEmail");
    const sendSmsOtp = req.app.get("sendSmsOtp");

    if (status === "SUCCESS") {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);
      const expiryString = expiry.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

      // 1. Send Email Invoice
      if (user.email && !user.email.includes("@phone.twiller.local") && sendEmail) {
        const emailHtml = `
          <div style="font-family:'Outfit','Helvetica Neue',Arial,sans-serif;max-width:550px;margin:20px auto;background:#000000;border:1px solid #2f3336;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.9);">
            <div style="background:linear-gradient(135deg,#1d9bf0,#7856ff,#f91880);padding:40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border-radius:50%;padding:14px;margin-bottom:16px;">
                <svg viewBox="0 0 24 24" style="height:36px;width:36px;fill:#ffffff;display:block;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </div>
              <h2 style="font-size:24px;font-weight:900;margin:0;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">Order Confirmed</h2>
            </div>
            <div style="padding:40px 32px;background:#000000;color:#e7e9ea;">
              <h3 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 16px;text-align:center;">Thank you for your purchase, ${user.displayName || "User"}!</h3>
              <p style="color:#8b98a5;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">Your Twiller Premium subscription is now active. Here are your order details:</p>
              
              <div style="background:#16181c;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #2f3336;">
                <table style="width:100%;color:#e7e9ea;font-size:14px;border-collapse:collapse;">
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Plan</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#1d9bf0;">${planName}</td></tr>
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Amount Paid</td><td style="padding:10px 0;text-align:right;font-weight:bold;">₹${amount}</td></tr>
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Order ID</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-size:12px;">${orderId}</td></tr>
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Payment ID</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-size:12px;">${paymentId || "N/A"}</td></tr>
                  <tr><td style="padding:10px 0;color:#71767b;">Expiry Date</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#ffd400;">${expiryString}</td></tr>
                </table>
              </div>
              
              <div style="text-align:center;border-top:1px solid #2f3336;padding-top:24px;margin-top:16px;">
                <p style="color:#71767b;font-size:12px;line-height:1.5;margin:0;">Enjoy unlimited access, custom features, voice tweets, and higher daily post limits!</p>
                <p style="color:#1d9bf0;font-size:13px;font-weight:bold;margin:16px 0 0;">Twiller Premium Billing</p>
              </div>
            </div>
          </div>
        `;
        await sendEmail({
          to: user.email,
          subject: `Order Confirmed: Twiller Premium ${planName} Subscription`,
          html: emailHtml,
          text: `Thank you for purchasing Twiller Premium ${planName}!\n\nOrder Details:\nPlan: ${planName}\nAmount Paid: ₹${amount}\nOrder ID: ${orderId}\nPayment ID: ${paymentId || "N/A"}\nExpiry Date: ${expiryString}\n\nEnjoy your new features!\n- Twiller Billing`,
        });
        console.log(`[Billing Email] Invoice sent to ${user.email}`);
      }

      // 2. Send WhatsApp/SMS
      if (user.phone && sendSmsOtp) {
        const customMessage = `Twiller Premium Order Confirmed! Plan: ${planName}, Price: ₹${amount}, Order ID: ${orderId}, Payment ID: ${paymentId || "N/A"}, Expiry Date: ${expiryString}. Thanks for subscribing!`;
        await sendSmsOtp(user.phone, null, customMessage);
        console.log(`[Billing SMS/WhatsApp] Invoice receipt sent to ${user.phone}`);
      }
    } else {
      // status === "FAILED"
      // 1. Send Email Notification
      if (user.email && !user.email.includes("@phone.twiller.local") && sendEmail) {
        const emailHtml = `
          <div style="font-family:'Outfit','Helvetica Neue',Arial,sans-serif;max-width:550px;margin:20px auto;background:#000000;border:1px solid #2f3336;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.9);">
            <div style="background:linear-gradient(135deg,#f4212e,#7856ff,#000000);padding:40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border-radius:50%;padding:14px;margin-bottom:16px;">
                <svg viewBox="0 0 24 24" style="height:36px;width:36px;fill:#ffffff;display:block;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
              </div>
              <h2 style="font-size:24px;font-weight:900;margin:0;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">Payment Failed</h2>
            </div>
            <div style="padding:40px 32px;background:#000000;color:#e7e9ea;">
              <h3 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 16px;text-align:center;">Payment unsuccessful for Twiller Premium ${planName}</h3>
              <p style="color:#8b98a5;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">Unfortunately, your transaction could not be processed. Here are the details:</p>
              
              <div style="background:#16181c;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #2f3336;">
                <table style="width:100%;color:#e7e9ea;font-size:14px;border-collapse:collapse;">
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Plan</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#f4212e;">${planName}</td></tr>
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Amount</td><td style="padding:10px 0;text-align:right;font-weight:bold;">₹${amount}</td></tr>
                  <tr style="border-bottom:1px solid #2f3336;"><td style="padding:10px 0;color:#71767b;">Order ID</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-size:12px;">${orderId}</td></tr>
                  <tr><td style="padding:10px 0;color:#71767b;">Failure Reason</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#f4212e;">${failureReason || "Payment cancelled or declined"}</td></tr>
                </table>
              </div>
              
              <div style="text-align:center;border-top:1px solid #2f3336;padding-top:24px;margin-top:16px;">
                <p style="color:#71767b;font-size:12px;line-height:1.5;margin:0;">Please try again. If your account was debited, it will be refunded automatically by your bank within 5-7 business days.</p>
                <p style="color:#1d9bf0;font-size:13px;font-weight:bold;margin:16px 0 0;">Twiller Premium Billing</p>
              </div>
            </div>
          </div>
        `;
        await sendEmail({
          to: user.email,
          subject: `Payment Failed: Twiller Premium ${planName} Subscription`,
          html: emailHtml,
          text: `Payment unsuccessful for Twiller Premium ${planName}!\n\nOrder Details:\nPlan: ${planName}\nAmount: ₹${amount}\nOrder ID: ${orderId}\nReason: ${failureReason || "Payment cancelled or declined"}\n\nPlease try again.\n- Twiller Billing`,
        });
        console.log(`[Billing Email] Failure notification sent to ${user.email}`);
      }

      // 2. Send WhatsApp/SMS Failure
      if (user.phone && sendSmsOtp) {
        const customMessage = `Twiller Premium Payment Failed! Plan: ${planName}, Price: ₹${amount}, Order ID: ${orderId}. Reason: ${failureReason || "Payment cancelled or declined"}. Please try again.`;
        await sendSmsOtp(user.phone, null, customMessage);
        console.log(`[Billing SMS/WhatsApp] Failure notification sent to ${user.phone}`);
      }
    }
  } catch (err) {
    console.error("Error sending payment notification:", err);
  }
};

export const verifyPaymentFrontend = async (req, res) => {
    try {
        const { userId, plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        let signatureValid = false;

        if (razorpay_order_id && razorpay_order_id.startsWith("mock_rzp_order_") && allowMockPayments()) {
            console.log(`[MOCK PAYMENT] Bypassing signature verification for mock order: ${razorpay_order_id}`);
            signatureValid = true;
        } else {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
                .update(body.toString())
                .digest("hex");
            signatureValid = (expectedSignature === razorpay_signature);
        }

        if (signatureValid) {
            await Payment.findOneAndUpdate(
                { razorpay_order_id },
                { $set: { razorpay_payment_id, status: "SUCCESS" } }
            );

            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + 1);

            const updatedUser = await User.findByIdAndUpdate(userId, {
                $set: {
                    "subscription.plan": plan,
                    "subscription.activatedAt": new Date(),
                    "subscription.expiresAt": expiry,
                    "subscription.orderId": razorpay_order_id,
                    dailyTweetCount: 0
                }
            }, { new: true });

            if (updatedUser) {
              sendPaymentNotification(req, updatedUser, plan, PLAN_PRICES[plan], razorpay_order_id, razorpay_payment_id, "SUCCESS")
                .catch(err => console.error("Error sending receipt in background:", err));
            }

            return res.status(200).json({ success: true, paymentId: razorpay_payment_id, plan, amount: PLAN_PRICES[plan], planName: plan, user: updatedUser });
        } else {
            return res.status(400).json({ error: "Invalid signature" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const webhook = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
      return res.status(503).send("Webhook secret is not configured");
    }
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "order.paid") {
      const order = payload.order.entity;
      const payment = payload.payment.entity;

      const paymentRecord = await Payment.findOneAndUpdate(
        { razorpay_order_id: order.id },
        {
          $set: {
            status: "SUCCESS",
            razorpay_payment_id: payment.id,
            payment_method: payment.method,
            method_details: payment.bank || payment.wallet || payment.card_id || payment.vpa || "Unknown",
          }
        },
        { new: true }
      );

      if (paymentRecord) {
        const amountINR = paymentRecord.amount;
        let activatedPlan = "free";
        for (const [key, value] of Object.entries(PLAN_PRICES)) {
            if (value === amountINR) activatedPlan = key;
        }

        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);

        const updatedUser = await User.findByIdAndUpdate(paymentRecord.user_id, {
          $set: {
            "subscription.plan": activatedPlan,
            "subscription.activatedAt": new Date(),
            "subscription.expiresAt": expiry,
            "subscription.orderId": order.id,
            dailyTweetCount: 0
          }
        }, { new: true });

        if (updatedUser) {
          sendPaymentNotification(req, updatedUser, activatedPlan, amountINR, order.id, payment.id, "SUCCESS")
            .catch(err => console.error("Error sending receipt in background from webhook:", err));
        }
      }

    } else if (event === "payment.failed") {
      const payment = payload.payment.entity;
      const failureReason = payment.error_description || "PAYMENT_FAILED";

      const paymentRecord = await Payment.findOneAndUpdate(
        { razorpay_order_id: payment.order_id },
        {
          $set: {
            status: "FAILED",
            failure_reason: failureReason
          }
        },
        { new: true }
      );

      if (paymentRecord) {
        const user = await User.findById(paymentRecord.user_id);
        if (user) {
          const amountINR = paymentRecord.amount;
          let plan = "premium";
          for (const [key, value] of Object.entries(PLAN_PRICES)) {
              if (value === amountINR) plan = key;
          }
          sendPaymentNotification(req, user, plan, amountINR, payment.order_id, payment.id, "FAILED", failureReason)
            .catch(err => console.error("Error sending failure notification from webhook:", err));
        }
      }
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const cancelPlan = async (req, res) => {
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

    res.status(200).json({ success: true, message: "Plan canceled successfully", user });
  } catch (error) {
    console.error("Cancel plan error:", error);
    res.status(500).json({ error: "Failed to cancel plan" });
  }
};

export const markFailed = async (req, res) => {
  try {
    const { orderId, failureReason } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      { razorpay_order_id: orderId },
      { $set: { status: "FAILED", failure_reason: failureReason || "Payment cancelled" } },
      { new: true }
    );

    if (updatedPayment) {
      const user = await User.findById(updatedPayment.user_id);
      if (user) {
        const amountINR = updatedPayment.amount;
        let plan = "premium";
        for (const [key, value] of Object.entries(PLAN_PRICES)) {
            if (value === amountINR) plan = key;
        }
        sendPaymentNotification(req, user, plan, amountINR, orderId, updatedPayment.razorpay_payment_id, "FAILED", updatedPayment.failure_reason)
          .catch(err => console.error("Error sending failure notification:", err));
      }
    }

    res.status(200).json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error("Mark failed payment error:", error);
    res.status(500).json({ error: "Failed to mark payment as failed" });
  }
};
