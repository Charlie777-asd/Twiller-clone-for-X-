import express from "express";
import { createOrder, verifyPaymentFrontend, webhook, cancelPlan, markFailed } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPaymentFrontend);
router.post("/webhook", webhook);
router.post("/cancel-plan", cancelPlan);
router.post("/mark-failed", markFailed);

export default router;
