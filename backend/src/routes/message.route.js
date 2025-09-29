import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForsidebar,
  getMessages,
  sendMessage,
} from "../controllers/message.controllers.js";

const router = express.Router();
router.get("/users", ProtectRoute, getUsersForsidebar);
router.get("/:id", ProtectRoute, getMessages);
router.post("/send", ProtectRoute, sendMessage);

export default router;
