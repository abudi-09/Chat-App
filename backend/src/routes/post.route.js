import express from "express";
import multer from "multer";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createPost,
  getPosts,
  getPostById,
  togglePostLike,
  createComment,
  getPostComments,
  toggleCommentLike,
  repostPost,
  uploadPostMedia,
  incrementPostView,
} from "../controllers/post.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const fileFilter = (req, file, cb) => {
  if (SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get("/", ProtectRoute, getPosts);
router.post("/media", ProtectRoute, upload.single("media"), uploadPostMedia);
router.post("/", ProtectRoute, createPost);
router.get("/:postId", ProtectRoute, getPostById);
router.post("/:postId/view", incrementPostView);
router.post("/:postId/like", ProtectRoute, togglePostLike);
router.post("/:postId/repost", ProtectRoute, repostPost);
router.get("/:postId/comments", ProtectRoute, getPostComments);
router.post("/:postId/comments", ProtectRoute, createComment);
router.post("/comments/:commentId/like", ProtectRoute, toggleCommentLike);

export default router;
