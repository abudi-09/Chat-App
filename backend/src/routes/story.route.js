import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createStory,
  getStories,
  markStoryViewed,
} from "../controllers/story.controller.js";

const router = express.Router();

router.get("/", ProtectRoute, getStories);
router.post("/", ProtectRoute, createStory);
router.post("/:storyId/view", ProtectRoute, markStoryViewed);

export default router;
