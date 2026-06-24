/**
 * migrate_subscriptions.js
 * 
 * One-time migration script to update subscription plan names:
 *   gold     → silver  (₹300, 5 tweets/day)
 *   platinum → gold    (₹1000, unlimited)
 * 
 * Run once after deploying the updated backend:
 *   node migrate_subscriptions.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in environment");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

const db = mongoose.connection.db;
const users = db.collection("users");

// Step 1: Rename old "gold" (₹300, 15/day) → "silver" (₹300, 5/day)
const goldResult = await users.updateMany(
  { "subscription.plan": "gold" },
  { $set: { "subscription.plan": "silver" } }
);
console.log(`✅ Migrated ${goldResult.modifiedCount} gold → silver users`);

// Step 2: Rename old "platinum" (₹700, unlimited) → "gold" (₹1000, unlimited)
const platinumResult = await users.updateMany(
  { "subscription.plan": "platinum" },
  { $set: { "subscription.plan": "gold" } }
);
console.log(`✅ Migrated ${platinumResult.modifiedCount} platinum → gold users`);

await mongoose.disconnect();
console.log("✅ Migration complete. Disconnected from MongoDB.");
process.exit(0);
