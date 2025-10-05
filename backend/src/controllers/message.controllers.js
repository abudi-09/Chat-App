import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";

const buildDmConversationQuery = (userA, userB) => ({
  type: "dm",
  participants: { $all: [userA, userB] },
  "participants.0": { $exists: true },
  "participants.1": { $exists: true },
  "participants.2": { $exists: false },
});

const updateConversationSnapshot = async ({
  senderId,
  receiverId,
  text,
  imageUrl,
  messageCreatedAt,
}) => {
  const query = buildDmConversationQuery(senderId, receiverId);
  let conversation = await Conversation.findOne(query);

  if (!conversation) {
    conversation = await Conversation.create({
      type: "dm",
      participants: [senderId, receiverId],
    });
  }

  conversation.lastMessage = {
    text: text?.slice(0, 2000) || "",
    image: imageUrl || "",
    createdAt: messageCreatedAt,
  };

  await conversation.save();
  await conversation.populate("participants", "fullname email profilePic");

  return conversation;
};
export const getUsersForsidebar = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForsidebar controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const sendMessage = async (req, res) => {
  try {
    console.log("SEND MESSAGE BODY:", req.body);
    console.log("USER:", req.user);
    const { text, image, receiverId } = req.body;
    const senderId = req.user._id;
    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }
    if (!senderId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: senderId missing" });
    }
    if (!text && !image) {
      return res
        .status(400)
        .json({ message: "Message text or image required" });
    }
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    await newMessage.save();

    const conversation = await updateConversationSnapshot({
      senderId,
      receiverId,
      text,
      imageUrl,
      messageCreatedAt: newMessage.createdAt,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      io.to(receiverSocketId).emit("conversationUpdated", conversation);
    }

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("conversationUpdated", conversation);
    }

    res.status(201).json({ message: newMessage, conversation });
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
