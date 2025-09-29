import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controllers.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put(
  "/update-profile",
  ProtectRoute,
  upload.single("profilePic"),
  updateProfile
);
router.get("/check", ProtectRoute, checkAuth);

export default router;
