import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createConversation,
  getConversations,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.get("/", ProtectRoute, getConversations);
router.post("/", ProtectRoute, createConversation);

export default router;
