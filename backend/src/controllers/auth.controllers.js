import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

const buildUserResponse = (userDoc) => {
  if (!userDoc) return null;
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete user.password;
  delete user.twoFactorSecret;
  delete user.backupCodes;
  return {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    username: user.username,
    bio: user.bio,
    statusMessage: user.statusMessage,
    profilePic: user.profilePic,
    pronouns: user.pronouns,
    timezone: user.timezone,
    role: user.role,
    socialLinks: user.socialLinks || [],
    preferences: user.preferences,
    twoFactorEnabled: user.twoFactorEnabled,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const signup = async (req, res) => {
  console.log("Signup body:", req.body);
  const { fullname, email, password } = req.body;

  try {
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ fullname, email, password: hashedPassword });
    await newUser.save();
    generateToken(newUser._id, res);

    res.status(201).json(buildUserResponse(newUser));
  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    const fullUser = await User.findById(user._id);
    res.status(200).json(buildUserResponse(fullUser));
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // Assuming req.user is set by authentication middleware
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Assuming req.file is set by multer for file uploads
    if (!req.file) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(buildUserResponse(updatedUser));
  } catch (error) {
    console.error("Error in update profile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json(buildUserResponse(req.user));
  } catch (error) {
    console.error("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
