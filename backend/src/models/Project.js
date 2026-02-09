const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
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
    },

    // Thành viên dự án (OWNER nằm ở đây)
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
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
projectSchema.index({ "members.user": 1 });
projectSchema.index({ isArchived: 1, updatedAt: -1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ name: "text", description: "text" });

// Check if user is member
projectSchema.methods.isMember = function (userId) {
  return this.members.some((member) => {
    const memberId = member.user._id ? member.user._id : member.user;
    return memberId.toString() === userId.toString();
  });
};

// Kiểm Tra nếu user là thành viên
projectSchema.methods.isMember = function (userId) {
  return this.members.some((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
};

// Kiểm tra nếu user có quyền chỉnh sửa project
projectSchema.methods.canEdit = function (userId) {
  const member = this.members.find((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });

  return member && ["owner", "editor"].includes(member.role);
};

// Kiểm tra nếu user có LÀ OWNER của project
projectSchema.methods.isOwner = function (userId) {
  const member = this.members.find((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });

  return member && ["owner"].includes(member.role);
};

// Lấy vai trò của user trong project
projectSchema.methods.getUserRole = function (userId) {
  const member = this.members.find((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });

  return member ? member.role : null;
};
module.exports = mongoose.model("Project", projectSchema);
