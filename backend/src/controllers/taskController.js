const path = require("path");
const fs = require("fs");
const { z } = require("zod");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Column = require("../models/Column");
const Comment = require("../models/Comment");
const { cache } = require("../config/cache");
const { createNotificationForUsers } = require("../services/notifications");

class TaskController {
  // Lấy tasks theo project
  static async getTasksByProject(req, res, next) {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.userId;

      // Kiểm tra project tồn tại và user có quyền
      const project = await Project.findById(projectId);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Kiểm tra cache
      const cacheKey = `project:${projectId}:tasks`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      // Lấy tất cả tasks
      const tasks = await Task.find({
        project: projectId,
        isDeleted: false,
      })
        .populate("createdBy", "email fullName avatarUrl")
        .populate("assignedTo", "email fullName avatarUrl")
        .populate("column", "name color")
        .sort({ column: 1, position: 1 });

      // Định dạng tasks với virtual fields
      const formattedTasks = tasks.map((task) => ({
        ...task.toObject(),
        isOverdue: task.isOverdue,
        progress: task.progress,
      }));

      // Cache trong 30 giây
      cache.set(cacheKey, formattedTasks, 30);

      return res.json({
        success: true,
        data: formattedTasks,
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy chi tiết task
  static async getTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId)
        .populate("createdBy", "email fullName avatarUrl")
        .populate("assignedTo", "email fullName avatarUrl")
        .populate("column", "name color")
        .populate("project", "name");

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      return res.json({
        success: true,
        data: {
          ...task.toObject(),
          isOverdue: task.isOverdue,
          progress: task.progress,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo task mới
  static async createTask(req, res, next) {
    try {
      // Bỏ comment validation nếu có schema
      // const body = schema.parse(req.body);
      const body = req.body;
      const userId = req.user.userId;

      // THÊM VALIDATION CƠ BẢN
      if (!body.title || !body.title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Task title is required",
        });
      }

      if (!body.projectId) {
        return res.status(400).json({
          success: false,
          message: "Valid projectId is required",
        });
      }

      if (!body.column) {
        return res.status(400).json({
          success: false,
          message: "Valid column ID is required",
        });
      }

      // Kiểm tra project tồn tại và user có quyền
      const project = await Project.findById(body.projectId);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Kiểm tra column tồn tại và thuộc project
      const column = await Column.findOne({
        _id: body.column,
        projectId: body.projectId,
        isDeleted: false,
      });

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Column not found or does not belong to this project",
        });
      }

      // Tìm vị trí lớn nhất trong column
      const maxPositionTask = await Task.findOne({
        column: body.column,
        isDeleted: false,
      }).sort({ position: -1 });

      const position =
        body.position !== undefined
          ? body.position
          : maxPositionTask
            ? maxPositionTask.position + 1
            : 0;

      // Tạo task - SỬA assignedTo THÀNH MẢNG
      const task = await Task.create({
        project: body.projectId,
        title: body.title.trim(),
        description: body.description ? body.description.trim() : null,
        priority: body.priority || "medium",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        column: body.column,
        position: position,
        createdBy: userId,
        // SỬA: assignedTo thành mảng
        assignedTo: body.assignedTo ? [body.assignedTo] : [],
        tags: body.tags || [],
        metadata: {
          estimatedHours: body.metadata?.estimatedHours || 0,
          actualHours: body.metadata?.actualHours || 0,
        },
      });

      // Populate thông tin cần thiết
      const populatedTask = await Task.findById(task._id)
        .populate("column", "name color")
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .lean();

      // Xóa cache
      cache.del(`project:${body.projectId}:tasks`);

      // Cập nhật thống kê project
      project.statistics.taskCount += 1;
      await project.save();

      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        io.to(`project-${task.project}`).emit("task-created-broadcast", {
          task: populatedTask,
          columnId: populatedTask.column._id,
          createdBy: "server",
        });
      }

      // Thông báo cho người được giao
      if (body.assignedTo && body.assignedTo !== userId) {
        await createNotificationForUsers([body.assignedTo], {
          type: "task_assigned",
          title: `New task assigned: ${body.title}`,
          message: `You have been assigned to a task in "${project.name}"`,
          data: {
            taskId: task._id,
            projectId: body.projectId,
            taskTitle: body.title,
          },
          actionUrl: `/tasks/${task._id}`,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: populatedTask, // TRẢ VỀ ĐẦY ĐỦ TASK DATA
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      // Xử lý duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Duplicate task detected",
        });
      }

      console.error("Create task error:", error);
      next(error);
    }
  }

  // Cập nhật task
  static async updateTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;
      const updates = req.body;

      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: " Bnạ Không Phải là thành viên dự án",
        });
      }

      // Kiểm tra user có thể chỉnh sửa (phải là editor hoặc được giao task)
      const isAssigned = task.assignedTo.some(
        (assignee) => assignee.toString() === userId.toString(),
      );

      // Kiểm tra quyền từ project (cần thêm method canEdit vào Project model)
      const canEdit =
        (project.canEdit && project.canEdit(userId)) ||
        isAssigned ||
        userId === task.createdBy.toString();

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      // Kiểm tra column nếu có thay đổi
      if (updates.column && updates.column !== task.column.toString()) {
        const column = await Column.findOne({
          _id: updates.column,
          projectId: task.project,
          isDeleted: false,
        });

        if (!column) {
          return res.status(404).json({
            success: false,
            message: "Column not found or does not belong to this project",
          });
        }
      }

      // Theo dõi thay đổi cho thông báo
      const oldAssignees = task.assignedTo.map((id) => id.toString());
      const oldStatus = task.status; // LƯU Ý: Schema không có field status!
      const oldColumn = task.column?.toString();

      // Xử lý assignedTo - chuyển đổi thành mảng nếu cần
      if (updates.assignedTo !== undefined) {
        if (Array.isArray(updates.assignedTo)) {
          task.assignedTo = updates.assignedTo;
        } else if (updates.assignedTo) {
          task.assignedTo = [updates.assignedTo];
        } else {
          task.assignedTo = [];
        }
        delete updates.assignedTo; // Xóa để không ghi đè sau này
      }

      // Xử lý tags - chuyển đổi thành mảng nếu cần
      if (updates.tags !== undefined) {
        if (Array.isArray(updates.tags)) {
          task.tags = updates.tags;
        } else if (typeof updates.tags === "string") {
          task.tags = updates.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
        } else {
          task.tags = [];
        }
        delete updates.tags;
      }

      // Xử lý position khi di chuyển column
      if (updates.column && updates.column !== oldColumn) {
        // Di chuyển sang column mới - đặt ở cuối
        const maxPositionInNewColumn = await Task.findOne({
          column: updates.column,
          isDeleted: false,
        }).sort({ position: -1 });

        updates.position = maxPositionInNewColumn
          ? maxPositionInNewColumn.position + 1
          : 0;
      }

      // Xử lý completion date khi status thay đổi
      // LƯU Ý: Schema không có field status, có thể dùng isArchived hoặc column
      if (
        updates.isArchived !== undefined &&
        task.isArchived !== updates.isArchived
      ) {
        if (updates.isArchived === true) {
          task.metadata.completionDate = new Date();
        } else {
          task.metadata.completionDate = null;
        }
      }

      // Cập nhật các trường còn lại
      Object.keys(updates).forEach((key) => {
        if (
          updates[key] !== undefined &&
          key !== "assignedTo" &&
          key !== "tags"
        ) {
          if (key === "dueDate" && updates[key] === null) {
            task[key] = null;
          } else if (key === "metadata") {
            task[key] = { ...task[key], ...updates[key] };
          } else {
            task[key] = updates[key];
          }
        }
      });

      task.updatedAt = Date.now();

      await task.save();

      // Populate thông tin cho response
      const updatedTask = await Task.findById(task._id)
        .populate("column", "name color")
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .populate("project", "name")
        .lean();

      // Xóa cache
      if (cache && cache.del) {
        cache.del(`project:${task.project}:tasks`);
      }

      // Gửi thông báo cho thay đổi quan trọng
      const newAssignees = task.assignedTo.map((id) => id.toString());

      // Thông báo cho người được giao mới
      const addedAssignees = newAssignees.filter(
        (id) => !oldAssignees.includes(id),
      );
      if (addedAssignees.length > 0) {
        // Sử dụng helper function để gửi thông báo
        await createNotificationForUsers(addedAssignees, {
          type: "task_assigned",
          title: `Task assigned: ${task.title}`,
          message: `You have been assigned to "${task.title}"`,
          data: {
            taskId: task._id,
            projectId: task.project,
            taskTitle: task.title,
          },
          actionUrl: `/tasks/${task._id}`,
        });
      }

      // Thông báo cho người bị gỡ
      const removedAssignees = oldAssignees.filter(
        (id) => !newAssignees.includes(id),
      );
      if (removedAssignees.length > 0) {
        await createNotificationForUsers(removedAssignees, {
          type: "task_updated",
          title: `Task assignment removed`,
          message: `You are no longer assigned to "${task.title}"`,
          data: {
            taskId: task._id,
            projectId: task.project,
          },
        });
      }

      const safeUpdates = {};
      const allowedFields = [
        "title",
        "description",
        "priority",
        "dueDate",
        "tags",
        "assignedTo",
        "metadata",
      ];

      allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
          safeUpdates[field] = updatedTask[field];
        }
      });
      // Gửi cập nhật qua socket.io
      const io = req.app.get("io");

      if (Object.keys(safeUpdates).length > 0) {
        io.to(`project-${task.project}`).emit("task-changed-broadcast", {
          taskId: task._id,
          updates: safeUpdates, // hoặc updates gọn hơn
          updatedBy: io.id,
          updatedByUser: userId,
        });
      }

      // Thông báo khi di chuyển column
      if (updates.column && updates.column !== oldColumn) {
        const newColumn = await Column.findById(updates.column);
        const oldColumnData = await Column.findById(oldColumn);

        const recipients = [
          task.createdBy.toString(),
          ...task.assignedTo.map((id) => id.toString()),
        ].filter((id) => id !== userId.toString());

        if (recipients.length > 0 && newColumn && oldColumnData) {
          await createNotificationForUsers(recipients, {
            type: "task_moved",
            title: `Task moved: ${task.title}`,
            message: `Task moved from "${oldColumnData.name}" to "${newColumn.name}"`,
            data: {
              taskId: task._id,
              projectId: task.project,
              oldColumn: oldColumnData.name,
              newColumn: newColumn.name,
            },
            actionUrl: `/tasks/${task._id}`,
          });
        }
      }

      return res.json({
        success: true,
        message: "Task updated successfully",
        data: updatedTask,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
          })),
        });
      }

      console.error("Update task error:", error);
      next(error);
    }
  }

  // Cập nhật nhiều tasks (cho drag and drop)
  static async updateTasksPosition(req, res, next) {
    try {
      const schema = z.object({
        updates: z
          .array(
            z.object({
              taskId: z.string().min(1),
              column: z.string().min(1),
              position: z.number().int().min(0),
            }),
          )
          .min(1),
      });

      const { updates } = schema.parse(req.body);
      const userId = req.user.userId;

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No updates provided",
        });
      }

      // Lấy task đầu tiên để kiểm tra project
      const firstTask = await Task.findById(updates[0].taskId);
      if (!firstTask) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(firstTask.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Kiểm tra user có thể chỉnh sửa
      if (!project.canEdit(userId)) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      const oldColumn = firstTask.column?.toString();

      // Thực hiện cập nhật
      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.taskId, project: firstTask.project },
          update: {
            column: update.column,
            position: update.position,
            updatedAt: Date.now(),
          },
        },
      }));

      // Gửi cập nhật qua socket.io
      const io = req.app.get("io");
      updates.forEach((update) => {
        io.to(`project-${firstTask.project}`).emit("task-moved-broadcast", {
          taskId: update.taskId,
          fromColumn: oldColumn, // bắt buộc
          toColumn: update.column,
          position: update.position,
          movedBy: io.id, // hoặc userId nhưng PHẢI THỐNG NHẤT
        });
      });

      // Thực hiện bulk update

      const result = await Task.bulkWrite(bulkOps);

      // Xóa cache
      cache.del(`project:${firstTask.project}:tasks`);

      return res.json({
        success: true,
        message: "Tasks position updated successfully",
        data: {
          modifiedCount: result.modifiedCount,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  // Lấy comments của task
  static async getComments(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const comments = await Comment.find({ task: taskId })
        .populate("user", "email fullName avatarUrl")
        .populate("mentions", "email fullName")
        .sort({ createdAt: 1 });

      return res.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Thêm comment
  static async addComment(req, res, next) {
    try {
      const schema = z.object({
        content: z.string().min(1).max(2000),
        parentComment: z.string().optional().nullable(),
        mentions: z.array(z.string()).optional(),
      });

      const taskId = req.params.id;
      const userId = req.user.userId;
      const body = schema.parse(req.body);

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Tạo comment
      const comment = await Comment.create({
        task: taskId,
        user: userId,
        content: body.content,
        parentComment: body.parentComment || null,
        mentions: body.mentions || [],
      });

      // Xóa cache
      cache.del(`project:${task.project}:tasks`);

      // Thông báo cho người được mention
      if (body.mentions && body.mentions.length > 0) {
        const mentionedUsers = body.mentions.filter((id) => id !== userId);
        if (mentionedUsers.length > 0) {
          await createNotificationForUsers(mentionedUsers, {
            type: "mention",
            title: `You were mentioned in a comment`,
            message: `${req.user.fullName || req.user.email} mentioned you in a comment on task "${task.title}"`,
            data: {
              taskId: task._id,
              projectId: task.project,
              commentId: comment._id,
            },
            actionUrl: `/tasks/${taskId}#comment-${comment._id}`,
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: comment,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }
      next(error);
    }
  }

  // Lấy attachments của task
  static async getAttachments(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Định dạng attachments với URLs
      const attachments = task.attachments.map((attachment) => ({
        ...attachment.toObject(),
        url: `/uploads/${path.basename(attachment.storagePath)}`,
        uploadedBy: {
          id: attachment.uploadedBy,
        },
      }));

      return res.json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa task (soft delete)
  static async deleteTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Kiểm tra user có phải là thành viên project và có thể chỉnh sửa
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Chỉ project editors/owners hoặc người tạo task mới có thể xóa
      const canDelete =
        project.canEdit(userId) || task.createdBy.toString() === userId;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      // Soft delete
      task.isDeleted = true;

      // Gửi sự kiện xóa qua socket.io
      const io = req.app.get("io");
      if (io) {
        io.to(`project-${task.project}`).emit("task-deleted-broadcast", {
          taskId: task._id,
          deletedBy: "server",
        });
      }
      await task.save();

      // Xóa cache
      cache.del(`project:${task.project}:tasks`);

      // Cập nhật thống kê project
      project.statistics.taskCount = Math.max(
        0,
        project.statistics.taskCount - 1,
      );
      if (task.status === "done") {
        project.statistics.completedTasks = Math.max(
          0,
          project.statistics.completedTasks - 1,
        );
      }
      await project.save();

      return res.json({
        success: true,
        message: "Task deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaskController;
