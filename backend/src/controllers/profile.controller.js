import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import Channel from "../models/channel.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";

const formatUser = (userDoc) => {
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
    pronouns: user.pronouns,
    timezone: user.timezone,
    role: user.role,
    profilePic: user.profilePic,
    socialLinks: user.socialLinks || [],
    preferences: user.preferences,
    twoFactorEnabled: user.twoFactorEnabled,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const normalizeLinks = (links = []) =>
  links
    .filter((link) => link && (link.label || link.url))
    .map((link) => ({
      label: link.label?.trim().slice(0, 30) || "",
      url: link.url?.trim() || "",
      isPrimary: Boolean(link.isPrimary),
    }))
    .slice(0, 5);

export const getCurrentProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      messagesSent,
      groupsJoined,
      channelsFollowed,
      recentStories,
      recentPosts,
      postsPublished,
    ] = await Promise.all([
      Message.countDocuments({ senderId: userId }),
      Group.countDocuments({ members: userId }),
      Channel.countDocuments({ members: userId }),
      Story.find({ author: userId }).sort({ createdAt: -1 }).limit(8).lean(),
      Post.find({ author: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Post.countDocuments({ author: userId }),
    ]);

    const totalStoryViews = recentStories.reduce(
      (total, story) => total + (story.viewers?.length || 0),
      0
    );

    const formattedStories = recentStories.map((story) => ({
      _id: story._id,
      caption: story.caption,
      mediaUrl: story.mediaUrl,
      visibility: story.visibility,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewersCount: story.viewers?.length || 0,
    }));

    const formattedPosts = recentPosts.map((post) => ({
      _id: post._id,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt,
      reactionsCount: post.reactions?.length || 0,
      commentsCount: post.commentsCount || 0,
      excerpt:
        post.body?.length > 160 ? `${post.body.slice(0, 157)}...` : post.body,
    }));

    await User.findByIdAndUpdate(
      userId,
      { lastActiveAt: new Date() },
      { timestamps: false }
    );

    res.status(200).json({
      user: formatUser(req.user),
      metrics: {
        messagesSent,
        groupsJoined,
        channelsFollowed,
        storyViews: totalStoryViews,
        postsPublished,
      },
      recentStories: formattedStories,
      recentPosts: formattedPosts,
    });
  } catch (error) {
    console.error("Error in getCurrentProfile controller:", error.message);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updateProfileInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullname,
      username,
      bio,
      statusMessage,
      pronouns,
      timezone,
      role,
      socialLinks,
    } = req.body;

    const updates = {};

    if (fullname) {
      updates.fullname = fullname.trim().slice(0, 120);
    }

    if (typeof bio === "string") {
      updates.bio = bio.trim().slice(0, 280);
    }

    if (typeof statusMessage === "string") {
      updates.statusMessage = statusMessage.trim().slice(0, 140);
    }

    if (typeof pronouns === "string") {
      updates.pronouns = pronouns.trim().slice(0, 30);
    }

    if (typeof timezone === "string") {
      updates.timezone = timezone.trim().slice(0, 60);
    }

    if (typeof role === "string") {
      updates.role = role.trim().slice(0, 60);
    }

    if (Array.isArray(socialLinks)) {
      updates.socialLinks = normalizeLinks(socialLinks);
    }

    if (username) {
      const normalized = username.trim().toLowerCase();
      const usernameRegex = /^[a-z0-9_\.]{3,30}$/;
      if (!usernameRegex.test(normalized)) {
        return res.status(400).json({
          message:
            "Username must be 3-30 characters and can include letters, numbers, underscores, or periods.",
        });
      }

      const existing = await User.findOne({
        username: normalized,
        _id: { $ne: userId },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "This username is already taken." });
      }

      updates.username = normalized;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ user: formatUser(updatedUser) });
  } catch (error) {
    console.error("Error in updateProfileInfo controller:", error.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { theme, accentColor, language, density, notifications } = req.body;

    const allowedThemes = ["system", "light", "dark", "contrast"];
    const allowedDensity = ["comfortable", "compact"];

    const update = {};
    if (theme && allowedThemes.includes(theme)) {
      update["preferences.theme"] = theme;
    }
    if (typeof accentColor === "string") {
      update["preferences.accentColor"] = accentColor;
    }
    if (typeof language === "string") {
      update["preferences.language"] = language;
    }
    if (density && allowedDensity.includes(density)) {
      update["preferences.density"] = density;
    }
    if (notifications && typeof notifications === "object") {
      Object.entries(notifications).forEach(([key, value]) => {
        update[`preferences.notifications.${key}`] = Boolean(value);
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ preferences: updatedUser.preferences });
  } catch (error) {
    console.error("Error in updatePreferences controller:", error.message);
    res.status(500).json({ message: "Failed to update preferences" });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const userId = req.user._id;
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: "chat-app/avatars",
      transformation: [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
      ],
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: upload.secure_url },
      { new: true }
    );

    res.status(200).json({ profilePic: updatedUser.profilePic });
  } catch (error) {
    console.error("Error in updateAvatar controller:", error.message);
    res.status(500).json({ message: "Failed to update avatar" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters long" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.lastPasswordChange = new Date();
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in changePassword controller:", error.message);
    res.status(500).json({ message: "Failed to update password" });
  }
};
