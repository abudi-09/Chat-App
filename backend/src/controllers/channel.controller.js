import Channel from "../models/channel.model.js";

export const getChannels = async (req, res) => {
  try {
    const userId = req.user._id;
    const channels = await Channel.find({
      $or: [{ isPrivate: false }, { members: userId }, { createdBy: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate("createdBy", "fullname email profilePic")
      .lean();

    res.status(200).json(channels);
  } catch (error) {
    console.error("Error in getChannels controller:", error.message);
    res.status(500).json({ message: "Failed to load channels" });
  }
};

export const createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, tags } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    const channel = await Channel.create({
      name: name.trim(),
      description,
      isPrivate: Boolean(isPrivate),
      createdBy: req.user._id,
      members: [req.user._id],
      tags,
    });

    const populated = await channel.populate(
      "createdBy",
      "fullname email profilePic"
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createChannel controller:", error.message);
    res.status(500).json({ message: "Failed to create channel" });
  }
};

export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (
      channel.isPrivate &&
      channel.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Channel is private" });
    }

    if (!channel.members.includes(req.user._id)) {
      channel.members.push(req.user._id);
      await channel.save();
    }

    res.status(200).json({ message: "Joined channel" });
  } catch (error) {
    console.error("Error in joinChannel controller:", error.message);
    res.status(500).json({ message: "Failed to join channel" });
  }
};

export const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    channel.members = channel.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );
    await channel.save();

    res.status(200).json({ message: "Left channel" });
  } catch (error) {
    console.error("Error in leaveChannel controller:", error.message);
    res.status(500).json({ message: "Failed to leave channel" });
  }
};
