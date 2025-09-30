import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  joinGroupWithCode,
  leaveGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.get("/", ProtectRoute, getGroups);
router.post("/", ProtectRoute, createGroup);
router.post("/join", ProtectRoute, joinGroupWithCode);
router.post("/:groupId/leave", ProtectRoute, leaveGroup);

export default router;
