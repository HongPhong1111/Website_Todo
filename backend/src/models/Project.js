const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      //
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "editor", "viewer"],
          default: "viewer",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    settings: {
      allowPublicView: {
        type: Boolean,
        default: false,
      },
      allowMemberInvite: {
        type: Boolean,
        default: true,
      },
    },
    statistics: {
      taskCount: {
        type: Number,
        default: 0,
      },
      completedTasks: {
        type: Number,
        default: 0,
      },
      lastActivity: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ isArchived: 1, updatedAt: -1 });
projectSchema.index({ name: "text", description: "text" });

// Check if user is member
projectSchema.methods.isMember = function (userId) {
  return this.members.some((member) => {
    const memberId = member.user._id ? member.user._id : member.user;
    return memberId.toString() === userId.toString();
  });
};

// Check if user can edit
projectSchema.methods.canEdit = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() == userId.toString(),
  );

  return member && ["owner", "editor"].includes(member.role);
};

module.exports = mongoose.model("Project", projectSchema);
