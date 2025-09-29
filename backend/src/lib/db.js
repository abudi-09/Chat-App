import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log("MONGODB_URI:", process.env.MONGODB_URI);
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};
