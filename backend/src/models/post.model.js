import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    width: Number,
    height: Number,
    duration: Number,
    thumbnailUrl: String,
    altText: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    providerPublicId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    reposts: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 8000,
    },
    richText: {
      type: Object,
      default: null,
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    hashtags: {
      type: [String],
      default: [],
      index: true,
    },
    mentions: {
      type: [String],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["public", "connections", "followers", "private", "channel"],
      default: "public",
      index: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    likedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    repostOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    scheduledFor: {
      type: Date,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ channel: 1, createdAt: -1 });
postSchema.index({ "metrics.likes": -1 });
postSchema.index({ repostOf: 1 });

const Post = mongoose.model("Post", postSchema);
export default Post;
