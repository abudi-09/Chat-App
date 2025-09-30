import express from "express";
import multer from "multer";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  changePassword,
  getCurrentProfile,
  updateAvatar,
  updatePreferences,
  updateProfileInfo,
} from "../controllers/profile.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/me", ProtectRoute, getCurrentProfile);
router.put("/me", ProtectRoute, updateProfileInfo);
router.put("/me/preferences", ProtectRoute, updatePreferences);
router.put("/me/avatar", ProtectRoute, upload.single("avatar"), updateAvatar);
router.post("/me/security/password", ProtectRoute, changePassword);

export default router;
