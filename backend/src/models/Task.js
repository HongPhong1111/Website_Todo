const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // mô tả công việc
    description: {
      type: String,
      default: null,
    },
    // dự án công việc thuộc về
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    // cột công việc thuộc về
    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    // trạng thái công việc
    status: {
      type: String,
      enum: ["todo", "in_progress", "done", "archived"],
      default: "todo",
    },
    // độ ưu tiên công việc
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // ngày hạn công việc
    dueDate: {
      type: Date,
      default: null,
    },
    // người tạo công việc
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // người được giao công việc
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    //
    attachments: [
      {
        originalName: String,
        mimeType: String,
        size: Number,
        storagePath: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // metadata bổ sung cho công việc
    metadata: {
      estimatedHours: {
        type: Number,
        default: 0,
      },
      actualHours: {
        type: Number,
        default: 0,
      },
      completionDate: {
        type: Date,
        default: null,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#FFFFFF",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ title: "text", description: "text" });

// Virtual for overdue status
taskSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate || this.status === "done") return false;
  return new Date() > this.dueDate;
});

// Virtual for completion percentage
taskSchema.virtual("progress").get(function () {
  const statusProgress = {
    todo: 0,
    in_progress: 50,
    done: 100,
    archived: 100,
  };
  return statusProgress[this.status] || 0;
});

module.exports = mongoose.model("Task", taskSchema);
