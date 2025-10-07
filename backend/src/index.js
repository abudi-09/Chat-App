import dotenv from "dotenv";
dotenv.config();
import express from "express";
import "./lib/cloudinary.js";
console.log("MONGODB_URI:", process.env.MONGODB_URI);
import authRoutes from "./routes/auth.route.js";
import channelRoutes from "./routes/channel.route.js";
import conversationRoutes from "./routes/conversation.route.js";
import groupRoutes from "./routes/group.route.js";
import messageRoutes from "./routes/message.route.js";
import postRoutes from "./routes/post.route.js";
import storyRoutes from "./routes/story.route.js";
import userRoutes from "./routes/user.route.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import cors from "cors";
import { app, server } from "./lib/socket.js"; // Importing the socket server setup

const allowedOrigins = (
  process.env.FRONTEND_URLS || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5001;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(
      "Failed to start server due to database connection error:",
      err
    );
    process.exit(1);
  });

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: "File upload error" });
  }
  res.status(500).json({ message: "Internal Server Error" });
});
