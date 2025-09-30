import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 280,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    inviteCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

groupSchema.index({ name: 1, createdBy: 1 });
groupSchema.index({ inviteCode: 1 });

const Group = mongoose.model("Group", groupSchema);
export default Group;
