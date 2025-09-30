import Story from "../models/story.model.js";

export const getStories = async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("author", "fullname profilePic")
      .lean();

    res.status(200).json(stories);
  } catch (error) {
    console.error("Error in getStories controller:", error.message);
    res.status(500).json({ message: "Failed to load stories" });
  }
};

export const createStory = async (req, res) => {
  try {
    const { mediaUrl, caption, visibility, expiresInHours = 24 } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ message: "Story media is required" });
    }

    const expiresAt = new Date(
      Date.now() + Number(expiresInHours) * 60 * 60 * 1000
    );

    const story = await Story.create({
      author: req.user._id,
      mediaUrl,
      caption,
      visibility,
      expiresAt,
    });

    const populated = await story.populate("author", "fullname profilePic");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createStory controller:", error.message);
    res.status(500).json({ message: "Failed to create story" });
  }
};

export const markStoryViewed = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    res.status(200).json({ message: "Story marked as viewed" });
  } catch (error) {
    console.error("Error in markStoryViewed controller:", error.message);
    res.status(500).json({ message: "Failed to mark story viewed" });
  }
};
