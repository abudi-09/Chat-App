import Conversation from "../models/conversation.model.js";

const buildConversationQuery = (userId, targetUserId) => ({
  type: "dm",
  participants: { $all: [userId, targetUserId] },
  "participants.0": { $exists: true },
  "participants.1": { $exists: true },
  "participants.2": { $exists: false },
});

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ "lastMessage.createdAt": -1, updatedAt: -1 })
      .populate("participants", "fullname email profilePic")
      .lean();

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ message: "Failed to load conversations" });
  }
};

export const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: "targetUserId is required" });
    }

    if (targetUserId.toString() === userId.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot start a conversation with yourself" });
    }

    let conversation = await Conversation.findOne(
      buildConversationQuery(userId, targetUserId)
    ).populate("participants", "fullname email profilePic");

    if (!conversation) {
      conversation = await Conversation.create({
        type: "dm",
        participants: [userId, targetUserId],
        lastMessage: {
          text: "",
          image: "",
          createdAt: new Date(),
        },
      });

      await conversation.populate("participants", "fullname email profilePic");
    }

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error in createConversation controller:", error.message);
    res.status(500).json({ message: "Failed to create conversation" });
  }
};
