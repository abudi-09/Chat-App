import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ MongoDB connected successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
