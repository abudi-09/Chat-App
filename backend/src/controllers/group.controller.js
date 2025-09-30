import Group from "../models/group.model.js";
import { nanoid } from "nanoid";

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [{ members: userId }, { createdBy: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate("createdBy", "fullname email profilePic")
      .populate("admins", "fullname profilePic")
      .lean();

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups controller:", error.message);
    res.status(500).json({ message: "Failed to load groups" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, inviteOnly } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const inviteCode = inviteOnly ? nanoid(8) : undefined;

    const group = await Group.create({
      name: name.trim(),
      description,
      inviteCode,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
    });

    const populated = await group
      .populate("createdBy", "fullname email profilePic")
      .populate("admins", "fullname profilePic");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createGroup controller:", error.message);
    res.status(500).json({ message: "Failed to create group" });
  }
};

export const joinGroupWithCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const group = await Group.findOne({ inviteCode });
    if (!group) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    if (group.isClosed) {
      return res.status(403).json({ message: "Group is closed" });
    }

    if (!group.members.includes(req.user._id)) {
      group.members.push(req.user._id);
      await group.save();
    }

    res.status(200).json({ message: "Joined group" });
  } catch (error) {
    console.error("Error in joinGroupWithCode controller:", error.message);
    res.status(500).json({ message: "Failed to join group" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    group.members = group.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );
    group.admins = group.admins.filter(
      (adminId) => adminId.toString() !== req.user._id.toString()
    );
    await group.save();

    res.status(200).json({ message: "Left group" });
  } catch (error) {
    console.error("Error in leaveGroup controller:", error.message);
    res.status(500).json({ message: "Failed to leave group" });
  }
};
