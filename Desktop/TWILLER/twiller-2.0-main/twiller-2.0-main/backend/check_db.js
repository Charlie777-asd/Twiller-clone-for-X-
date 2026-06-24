import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import { getMongoUrl } from "./config/runtime.js";

dotenv.config();

const check = async () => {
  try {
    await mongoose.connect(getMongoUrl());
    console.log("Connected to MongoDB...");
    
    const botsCount = await User.countDocuments({ isBot: true });
    const tweetsCount = await Tweet.countDocuments();
    
    console.log(`Verified Bots Count: ${botsCount}`);
    console.log(`Verified Tweets Count: ${tweetsCount}`);
    
    // Check first 5 tweets and their authors and timestamps to verify staggered ordering
    const sampleTweets = await Tweet.find().sort({ timestamp: -1 }).limit(5).populate("author");
    console.log("\nSample Staggered Feed:");
    sampleTweets.forEach((t, i) => {
      console.log(`${i + 1}. Bot: @${t.author?.username} | Time: ${t.timestamp.toISOString()} | Content: ${t.content.slice(0, 60)}...`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error(error);
    mongoose.disconnect();
  }
};

check();
