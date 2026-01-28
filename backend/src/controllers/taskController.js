const path = require("path");
const fs = require("fs");
const { z } = require("zod");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Comment = require("../models/Comment");
const { cache } = require("../config/cache");
const { createNotificationForUsers } = require("../services/notifications");

class TaskController {
  // Get tasks by project
  static async getTasksByProject(req, res, next) {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.userId;

      // Check if user is project member
      const project = await Project.findById(projectId);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Check cache
      const cacheKey = `project:${projectId}:tasks`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({
          data: cached,
          cached: true,
        });
      }

      // Fetch tasks
      const tasks = await Task.find({
        project: projectId,
        isDeleted: false,
      })
        .populate("createdBy", "email fullName avatarUrl")
        .populate("assignedTo", "email fullName avatarUrl")
        .sort({ updatedAt: -1 });

      // Format tasks with virtual fields
      const formattedTasks = tasks.map((task) => ({
        ...task.toObject(),
        isOverdue: task.isOverdue,
        progress: task.progress,
      }));

      // Cache for 30 seconds
      cache.set(cacheKey, formattedTasks, 30);

      return res.json({
        data: formattedTasks,
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get task details
  static async getTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId)
        .populate("createdBy", "email fullName avatarUrl")
        .populate("assignedTo", "email fullName avatarUrl")
        .populate("project", "name");

      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      // Check if user is project member
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      return res.json({
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

  // Create task
  static async createTask(req, res, next) {
    try {
      const schema = z.object({
        projectId: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.string().datetime().optional(),
        assignedTo: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        metadata: z
          .object({
            estimatedHours: z.number().min(0).optional(),
            actualHours: z.number().min(0).optional(),
          })
          .optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.user.userId;

      // Check if user is project member
      const project = await Project.findById(body.projectId);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Create task
      const task = await Task.create({
        project: body.projectId,
        title: body.title,
        description: body.description || null,
        priority: body.priority || "medium",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        createdBy: userId,
        assignedTo: body.assignedTo || null,
        tags: body.tags || [],
        metadata: {
          estimatedHours: body.metadata?.estimatedHours || 0,
          actualHours: body.metadata?.actualHours || 0,
        },
      });

      // Clear cache
      cache.del(`project:${body.projectId}:tasks`);

      // Update project statistics
      project.statistics.taskCount += 1;
      await project.save();

      // Notify assignee if assigned
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
        message: "Task created successfully",
        data: {
          id: task._id,
          title: task.title,
          status: task.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update task
  static async updateTask(req, res, next) {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.string().datetime().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z
          .object({
            estimatedHours: z.number().min(0).optional(),
            actualHours: z.number().min(0).optional(),
            completionDate: z.string().datetime().optional().nullable(),
          })
          .optional(),
      });

      const taskId = req.params.id;
      const userId = req.user.userId;
      const updates = schema.parse(req.body);

      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      // Check if user is project member and can edit
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Check if user can edit (must be editor or assigned to task)
      const canEdit =
        project.canEdit(userId) || task.assignedTo?.toString() === userId;

      if (!canEdit && userId !== task.createdBy.toString()) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      // Track changes for notifications
      const changes = [];
      const oldAssignee = task.assignedTo?.toString();
      const oldStatus = task.status;

      // Update fields
      if (updates.title !== undefined) {
        task.title = updates.title;
      }
      if (updates.description !== undefined) {
        task.description = updates.description;
      }
      if (updates.status !== undefined) {
        task.status = updates.status;
        if (updates.status === "done" && !task.metadata.completionDate) {
          task.metadata.completionDate = new Date();
        } else if (updates.status !== "done" && task.metadata.completionDate) {
          task.metadata.completionDate = null;
        }
      }
      if (updates.priority !== undefined) {
        task.priority = updates.priority;
      }
      if (updates.dueDate !== undefined) {
        task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      }
      if (updates.assignedTo !== undefined) {
        task.assignedTo = updates.assignedTo;
      }
      if (updates.tags !== undefined) {
        task.tags = updates.tags;
      }
      if (updates.metadata) {
        task.metadata = { ...task.metadata, ...updates.metadata };
      }

      await task.save();

      // Clear cache
      cache.del(`project:${task.project}:tasks`);

      // Send notifications for important changes
      if (
        updates.assignedTo !== undefined &&
        updates.assignedTo !== oldAssignee
      ) {
        // Notify new assignee
        if (updates.assignedTo) {
          await createNotificationForUsers([updates.assignedTo], {
            type: "task_assigned",
            title: `Task assigned: ${task.title}`,
            message: `You have been assigned to this task`,
            data: {
              taskId: task._id,
              projectId: task.project,
              taskTitle: task.title,
            },
            actionUrl: `/tasks/${task._id}`,
          });
        }

        // Notify old assignee if removed
        if (oldAssignee && oldAssignee !== updates.assignedTo) {
          await createNotificationForUsers([oldAssignee], {
            type: "task_updated",
            title: `Task assignment removed`,
            message: `You are no longer assigned to "${task.title}"`,
            data: {
              taskId: task._id,
              projectId: task.project,
            },
          });
        }
      }

      // Notify on status change
      if (updates.status !== undefined && updates.status !== oldStatus) {
        const statusNames = {
          todo: "To Do",
          in_progress: "In Progress",
          done: "Done",
          archived: "Archived",
        };

        await createNotificationForUsers(
          [
            task.createdBy.toString(),
            ...(task.assignedTo ? [task.assignedTo.toString()] : []),
          ].filter((id) => id !== userId),
          {
            type: "task_updated",
            title: `Task status changed: ${statusNames[updates.status]}`,
            message: `"${task.title}" is now ${statusNames[updates.status]}`,
            data: {
              taskId: task._id,
              projectId: task.project,
              oldStatus,
              newStatus: updates.status,
            },
            actionUrl: `/tasks/${task._id}`,
          },
        );
      }

      return res.json({
        message: "Task updated successfully",
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get task comments
  static async getComments(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      // Check if user is project member
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      const comments = await Comment.find({ task: taskId })
        .populate("user", "email fullName avatarUrl")
        .populate("mentions", "email fullName")
        .sort({ createdAt: 1 });

      return res.json({
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add comment
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
          message: "Task not found",
        });
      }

      // Check if user is project member
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Create comment
      const comment = await Comment.create({
        task: taskId,
        user: userId,
        content: body.content,
        parentComment: body.parentComment || null,
        mentions: body.mentions || [],
      });

      // Clear cache
      cache.del(`project:${task.project}:tasks`);

      // Notify mentioned users
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
        message: "Comment added successfully",
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get task attachments
  static async getAttachments(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      // Check if user is project member
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Format attachments with URLs
      const attachments = task.attachments.map((attachment) => ({
        ...attachment.toObject(),
        url: `/uploads/${path.basename(attachment.storagePath)}`,
        uploadedBy: {
          id: attachment.uploadedBy,
          // Note: We'd need to populate this separately if needed
        },
      }));

      return res.json({
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete task (soft delete)
  static async deleteTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const userId = req.user.userId;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      // Check if user is project member and can edit
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      // Only project editors/owners or task creator can delete
      const canDelete =
        project.canEdit(userId) || task.createdBy.toString() === userId;

      if (!canDelete) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      // Soft delete
      task.isDeleted = true;
      await task.save();

      // Clear cache
      cache.del(`project:${task.project}:tasks`);

      // Update project statistics
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
        message: "Task deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaskController;
