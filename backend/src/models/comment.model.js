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
    providerPublicId: String,
    altText: {
      type: String,
      trim: true,
      maxlength: 160,
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
    replies: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    richText: {
      type: Object,
      default: null,
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    mentions: {
      type: [String],
      default: [],
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
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
