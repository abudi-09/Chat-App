import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const preferenceSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ["system", "light", "dark", "contrast"],
      default: "system",
    },
    accentColor: {
      type: String,
      default: "#2563EB",
    },
    language: {
      type: String,
      default: "en",
    },
    density: {
      type: String,
      enum: ["comfortable", "compact"],
      default: "comfortable",
    },
    notifications: {
      type: Map,
      of: Boolean,
      default: {
        mentions: true,
        directMessages: true,
        channelHighlights: true,
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
    },
    statusMessage: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    pronouns: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "UTC",
    },
    role: {
      type: String,
      trim: true,
      default: "Member",
    },
    socialLinks: {
      type: [linkSchema],
      default: [],
    },
    preferences: {
      type: preferenceSchema,
      default: () => ({}),
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    backupCodes: {
      type: [String],
      select: false,
      default: [],
    },
    lastPasswordChange: {
      type: Date,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true, sparse: true });

const User = mongoose.model("User", userSchema);
export default User;
