const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // mô tả dự án
    description: {
      type: String,
      default: null,
    },
    // chủ sở hữu dự án
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // thành viên dự án
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
    // trạng thái lưu trữ dự án
    isArchived: {
      type: Boolean,
      default: false,
    },
    // cài đặt dự án
    settings: {
      allowPublicView: {
        type: Boolean,
        default: false,
      },
      // có cho phép thành viên mời người khác vào dự án không
      allowMemberInvite: {
        type: Boolean,
        default: true,
      },
    },
    // thống kê dự án
    statistics: {
      // số lượng công việc trong dự án
      taskCount: {
        type: Number,
        default: 0,
      },
      // số lượng công việc đã hoàn thành
      completedTasks: {
        type: Number,
        default: 0,
      },
      // thời gian hoạt động cuối cùng trong dự án
      lastActivity: {
        type: Date,
        default: null,
      },
    },
    // xóa dự án
    isDeleted: {
      type: Boolean,
      default: false,
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
