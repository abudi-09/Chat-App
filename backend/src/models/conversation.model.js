import mongoose from "mongoose";

const lastMessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4000,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["dm", "group", "channel"],
      default: "dm",
    },
    lastMessage: {
      type: lastMessageSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ type: 1 });

conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    (participantId) => participantId.toString() === userId.toString()
  );
};

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
