import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createChannel,
  getChannels,
  joinChannel,
  leaveChannel,
} from "../controllers/channel.controller.js";

const router = express.Router();

router.get("/", ProtectRoute, getChannels);
router.post("/", ProtectRoute, createChannel);
router.post("/:channelId/join", ProtectRoute, joinChannel);
router.post("/:channelId/leave", ProtectRoute, leaveChannel);

export default router;
