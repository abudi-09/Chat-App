import fs from "fs/promises";
import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Channel from "../models/channel.model.js";

const MAX_MEDIA_PER_POST = 4;

const extractHashtags = (text = "") => {
  const regex = /#(\w{2,50})/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].toLowerCase());
  }
  return Array.from(matches);
};

const ensurePostMetrics = (post) => {
  if (!post.metrics) {
    post.metrics = {
      likes: 0,
      comments: 0,
      reposts: 0,
      views: 0,
    };
  }
  return post.metrics;
};

const sanitizeVisibility = (value) => {
  const allowed = ["public", "connections", "followers", "private", "channel"];
  return allowed.includes(value) ? value : "public";
};

const serializePost = (postDoc, currentUserId) => {
  const post = postDoc.toObject ? postDoc.toObject() : postDoc;
  const metrics = post.metrics || {
    likes: 0,
    comments: 0,
    reposts: 0,
    views: 0,
  };
  const liked = Boolean(
    currentUserId &&
      post.likedBy?.some((id) => id.toString() === currentUserId.toString())
  );

  return {
    ...post,
    metrics,
    liked,
    likeCount: metrics.likes ?? post.likedBy?.length ?? 0,
    commentCount: metrics.comments ?? post.commentsCount ?? 0,
    repostCount: metrics.reposts ?? 0,
  };
};

const serializeComment = (commentDoc, currentUserId) => {
  const comment = commentDoc.toObject ? commentDoc.toObject() : commentDoc;
  const metrics = comment.metrics || { likes: 0, replies: 0 };
  const liked = Boolean(
    currentUserId &&
      comment.likedBy?.some((id) => id.toString() === currentUserId.toString())
  );

  return {
    ...comment,
    metrics,
    liked,
    likeCount: metrics.likes ?? comment.likedBy?.length ?? 0,
    replyCount: metrics.replies ?? 0,
  };
};

export const getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      scope = "all",
      channelId,
      cursor,
      limit = 20,
      sort = "recent",
    } = req.query;

    const filters = [];

    if (scope === "mine") {
      filters.push({ author: userId });
    } else if (scope === "channel") {
      if (!channelId) {
        return res.status(400).json({ message: "channelId is required" });
      }
      filters.push({ visibility: "channel", channel: channelId });
    } else if (scope === "reposts") {
      filters.push({ repostOf: { $ne: null } });
    } else {
      const channelIds = await Channel.find({ members: userId }).distinct(
        "_id"
      );
      filters.push({ visibility: "public" });
      filters.push({ visibility: "connections" });
      filters.push({ visibility: "followers", author: userId });
      if (channelIds.length > 0) {
        filters.push({ visibility: "channel", channel: { $in: channelIds } });
      }
      filters.push({ author: userId });
    }

    const query = filters.length > 0 ? { $or: filters } : {};

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const sortConfig =
      sort === "liked"
        ? { "metrics.likes": -1, createdAt: -1 }
        : sort === "trending"
        ? { "metrics.reposts": -1, "metrics.comments": -1, createdAt: -1 }
        : { createdAt: -1 };

    const posts = await Post.find(query)
      .sort(sortConfig)
      .limit(Math.min(Number(limit), 50))
      .populate("author", "fullname username profilePic")
      .populate("channel", "name slug")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "fullname username profilePic" },
          { path: "channel", select: "name slug" },
        ],
      })
      .lean();

    const data = posts.map((post) => serializePost(post, userId));

    res.status(200).json({
      data,
      nextCursor: data.length > 0 ? data[data.length - 1]._id : null,
    });
  } catch (error) {
    console.error("Error in getPosts controller:", error);
    res.status(500).json({ message: "Failed to load posts" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .populate("author", "fullname username profilePic")
      .populate("channel", "name slug")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "fullname username profilePic" },
          { path: "channel", select: "name slug" },
        ],
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (
      post.visibility === "private" &&
      !post.author._id.equals(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have permission to view this post" });
    }

    res.status(200).json(serializePost(post, req.user._id));
  } catch (error) {
    console.error("Error in getPostById controller:", error);
    res.status(500).json({ message: "Failed to load post" });
  }
};

export const createPost = async (req, res) => {
  try {
    const {
      body = "",
      richText = null,
      media = [],
      visibility = "public",
      channel,
      mentions = [],
    } = req.body;

    if (!body.trim() && media.length === 0) {
      return res.status(400).json({ message: "Post cannot be empty" });
    }

    if (media.length > MAX_MEDIA_PER_POST) {
      return res
        .status(400)
        .json({ message: "Maximum of 4 media attachments per post" });
    }

    const sanitizedVisibility = sanitizeVisibility(visibility);

    if (sanitizedVisibility === "channel" && !channel) {
      return res
        .status(400)
        .json({ message: "Channel id is required for channel posts" });
    }

    const post = await Post.create({
      author: req.user._id,
      body: body.trim(),
      richText,
      media,
      visibility: sanitizedVisibility,
      channel,
      hashtags: extractHashtags(body),
      mentions,
    });

    const populated = await post
      .populate("author", "fullname username profilePic")
      .populate("channel", "name slug");

    res.status(201).json(serializePost(populated, req.user._id));
  } catch (error) {
    console.error("Error in createPost controller:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const togglePostLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    ensurePostMetrics(post);

    const hasLiked = post.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      post.likedBy.pull(userId);
      post.metrics.likes = Math.max(0, (post.metrics.likes || 0) - 1);
    } else {
      post.likedBy.addToSet(userId);
      post.metrics.likes = (post.metrics.likes || 0) + 1;
    }

    await post.save();

    res.status(200).json({ liked: !hasLiked, likeCount: post.metrics.likes });
  } catch (error) {
    console.error("Error in togglePostLike controller:", error);
    res.status(500).json({ message: "Failed to update like" });
  }
};

export const repostPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { body = "", visibility = "public", mentions = [] } = req.body;

    const original = await Post.findById(postId)
      .populate("author", "fullname username profilePic")
      .populate("channel", "name slug");

    if (!original) {
      return res.status(404).json({ message: "Original post not found" });
    }

    const sanitizedVisibility = sanitizeVisibility(visibility);

    const repost = await Post.create({
      author: req.user._id,
      body: body.trim(),
      visibility: sanitizedVisibility,
      repostOf: original._id,
      hashtags: extractHashtags(body),
      mentions,
    });

    ensurePostMetrics(original);
    original.metrics.reposts = (original.metrics.reposts || 0) + 1;
    await original.save();

    const populated = await repost
      .populate("author", "fullname username profilePic")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "fullname username profilePic" },
          { path: "channel", select: "name slug" },
        ],
      });

    res.status(201).json(serializePost(populated, req.user._id));
  } catch (error) {
    console.error("Error in repostPost controller:", error);
    res.status(500).json({ message: "Failed to repost" });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      body = "",
      richText = null,
      media = [],
      parentCommentId = null,
      mentions = [],
    } = req.body;

    if (!body.trim() && media.length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    ensurePostMetrics(post);

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      if (parentComment.post.toString() !== postId.toString()) {
        return res
          .status(400)
          .json({ message: "Parent comment does not belong to this post" });
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      parentComment: parentCommentId,
      body: body.trim(),
      richText,
      media,
      mentions,
    });

    post.metrics.comments = (post.metrics.comments || 0) + 1;
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    if (parentComment) {
      parentComment.metrics = parentComment.metrics || { likes: 0, replies: 0 };
      parentComment.metrics.replies = (parentComment.metrics.replies || 0) + 1;
      await parentComment.save();
    }

    const populated = await comment.populate(
      "author",
      "fullname username profilePic"
    );

    res.status(201).json(serializeComment(populated, req.user._id));
  } catch (error) {
    console.error("Error in createComment controller:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { parentCommentId = null, limit = 20, cursor } = req.query;

    const filter = {
      post: postId,
      parentComment: parentCommentId || null,
    };

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 50))
      .populate("author", "fullname username profilePic")
      .lean();

    const data = comments.map((comment) =>
      serializeComment(comment, req.user._id)
    );

    res.status(200).json({
      data,
      nextCursor: data.length > 0 ? data[data.length - 1]._id : null,
    });
  } catch (error) {
    console.error("Error in getPostComments controller:", error);
    res.status(500).json({ message: "Failed to load comments" });
  }
};

export const toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!comment.metrics) {
      comment.metrics = { likes: 0, replies: 0 };
    }

    const hasLiked = comment.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      comment.likedBy.pull(userId);
      comment.metrics.likes = Math.max(0, (comment.metrics.likes || 0) - 1);
    } else {
      comment.likedBy.addToSet(userId);
      comment.metrics.likes = (comment.metrics.likes || 0) + 1;
    }

    await comment.save();

    res
      .status(200)
      .json({ liked: !hasLiked, likeCount: comment.metrics.likes });
  } catch (error) {
    console.error("Error in toggleCommentLike controller:", error);
    res.status(500).json({ message: "Failed to update like" });
  }
};

const uploadToCloudinary = async (filePath, mimetype) => {
  const isVideo = mimetype.startsWith("video/");
  const folder = isVideo ? "chat-app/posts/videos" : "chat-app/posts/images";

  const options = {
    folder,
    resource_type: isVideo ? "video" : "image",
  };

  if (!isVideo) {
    options.transformation = [{ width: 1600, crop: "limit" }];
  }

  const result = await cloudinary.uploader.upload(filePath, options);

  return {
    url: result.secure_url,
    type: isVideo ? "video" : "image",
    width: result.width,
    height: result.height,
    duration: result.duration,
    providerPublicId: result.public_id,
    thumbnailUrl: result.thumbnail_url,
  };
};

export const uploadPostMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { mimetype, path: filePath, size } = req.file;
    const isVideo = mimetype.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (size > maxSize) {
      await fs.unlink(filePath);
      return res
        .status(400)
        .json({
          message: `File exceeds maximum size of ${isVideo ? "50MB" : "10MB"}`,
        });
    }

    const supported = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!supported.includes(mimetype)) {
      await fs.unlink(filePath);
      return res.status(400).json({ message: "Unsupported file type" });
    }

    const uploaded = await uploadToCloudinary(filePath, mimetype);
    await fs.unlink(filePath).catch(() => {});

    res.status(201).json(uploaded);
  } catch (error) {
    console.error("Error in uploadPostMedia controller:", error);
    try {
      if (req.file?.path) {
        await fs.unlink(req.file.path);
      }
    } catch (_) {
      // ignore cleanup error
    }
    res.status(500).json({ message: "Failed to upload media" });
  }
};

export const incrementPostView = async (req, res) => {
  try {
    const { postId } = req.params;
    await Post.findByIdAndUpdate(postId, { $inc: { "metrics.views": 1 } });
    res.status(204).end();
  } catch (error) {
    console.error("Error in incrementPostView controller:", error);
    res.status(500).json({ message: "Failed to record view" });
  }
};
