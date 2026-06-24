import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import { getMongoUrl } from "./config/runtime.js";

dotenv.config();

const wipeData = async () => {
  try {
    await mongoose.connect(getMongoUrl());
    console.log("Connected to MongoDB...");

    // Find all bots
    const bots = await User.find({ isBot: true });
    const botIds = bots.map(b => b._id);
    
    // Delete all tweets made by bots
    const deletedTweets = await Tweet.deleteMany({ author: { $in: botIds } });
    console.log(`Deleted ${deletedTweets.deletedCount} bot tweets.`);

    // Delete all bots
    const deletedBots = await User.deleteMany({ isBot: true });
    console.log(`Deleted ${deletedBots.deletedCount} bot users.`);

    mongoose.disconnect();
    console.log("Done wiping seed data.");
  } catch (error) {
    console.error(error);
    mongoose.disconnect();
  }
};

wipeData();
