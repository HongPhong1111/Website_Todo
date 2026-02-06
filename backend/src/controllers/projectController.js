const { z } = require("zod");
const Project = require("../models/Project");
const User = require("../models/User");
const { cache } = require("../config/cache");
const { createNotificationForUsers } = require("../services/notifications");

class ProjectController {
  // Get user's projects
  static async getUserProjects(req, res, next) {
    try {
      const userId = req.user.userId;

      const projects = await Project.find({
        "members.user": userId,
        isArchived: false,
      })
        .populate("owner", "email fullName avatarUrl")
        .populate("members.user", "email fullName avatarUrl")
        .sort({ updatedAt: -1 });

      // Format response
      const formattedProjects = projects.map((project) => ({
        ...project.toObject(),
        memberCount: project.members.length,
        canEdit: project.canEdit(userId),
        isOwner: project.owner._id.toString() === userId,
      }));

      return res.json({
        data: formattedProjects,
        count: formattedProjects.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create project
  static async createProject(req, res, next) {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        settings: z
          .object({
            allowPublicView: z.boolean().optional(),
            allowMemberInvite: z.boolean().optional(),
          })
          .optional(),
      });

      const body = schema.parse(req.body);
      const ownerId = req.user.userId;

      // Create project
      const project = await Project.create({
        name: body.name,
        description: body.description || null,
        owner: ownerId,
        members: [
          {
            user: ownerId,
            role: "owner",
          },
        ],
        settings: {
          allowPublicView: body.settings?.allowPublicView || false,
          allowMemberInvite: body.settings?.allowMemberInvite || true,
        },
      });

      // Clear cache
      cache.del(`user:${ownerId}:projects`);

      return res.status(201).json({
        message: "Project created successfully",
        data: {
          id: project._id,
          name: project.name,
          description: project.description,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get project details
  static async getProject(req, res, next) {
    try {
      const projectId = req.params.id;
      const userId = req.user.userId;

      console.log("projectId", projectId);
      console.log("userId", userId);

      const project = await Project.findById(projectId)
        .populate("owner", "email fullName avatarUrl")
        .populate("members.user", "email fullName avatarUrl");

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Check if user is member
      if (!project.isMember(userId)) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      return res.json({
        success: true,
        message: "Project retrieved successfully",
        data: project,
        canEdit: project.canEdit(userId),
      });
    } catch (error) {
      next(error);
    }
  }

  // Update project
  static async updateProject(req, res, next) {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        settings: z
          .object({
            allowPublicView: z.boolean().optional(),
            allowMemberInvite: z.boolean().optional(),
          })
          .optional(),
      });

      const projectId = req.params.id;
      const userId = req.user.userId;
      const updates = schema.parse(req.body);

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Check permission
      if (!project.canEdit(userId)) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      // Update project
      if (updates.name) project.name = updates.name;
      if (updates.description !== undefined) {
        project.description = updates.description;
      }
      if (updates.settings) {
        project.settings = { ...project.settings, ...updates.settings };
      }

      await project.save();

      // Clear cache
      cache.del(`user:${userId}:projects`);
      cache.del(`project:${projectId}`);

      return res.json({
        message: "Project updated successfully",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add member to project
  static async projectMember(req, res, next) {
    try {
      const id = req.params.id;

      let project = await Project.findById(id).populate("members.user");

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      let members = project.members.map((i) => {
        return {
          ...i.user.toObject(),
          role: i.role,
          joinedAt: i.joinedAt,
          id: i.user._id,
        };
      });

      return res.json({
        success: true,
        message: "Member added successfully",
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  // Add member to project
  static async addMember(req, res, next) {
    try {
      const schema = z.object({
        userId: z.string().min(1),
        role: z.enum(["viewer", "editor"]).default("viewer"),
      });

      const projectId = req.params.id;
      const currentUserId = req.user.userId;
      const { userId, role } = schema.parse(req.body);

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Check permission
      if (!project.canEdit(currentUserId)) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      // Check if user exists
      const userToAdd = await User.findById(userId);
      if (!userToAdd) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // Check if already member
      const isAlreadyMember = project.members.some(
        (member) => member._id.toString() === userId,
      );

      if (isAlreadyMember) {
        return res.status(409).json({
          message: "User is already a member",
        });
      }

      // Add member
      project.members.push({
        user: userId,
        role: role === "editor" ? "editor" : "viewer",
      });

      await project.save();

      // Send notification
      await createNotificationForUsers([userId], {
        type: "project_shared",
        title: `You were added to project "${project.name}"`,
        message: `${req.user.fullName || req.user.email} added you as a ${role}`,
        data: { projectId, projectName: project.name },
        actionUrl: `/projects/${projectId}`,
      });

      return res.json({
        message: "Member added successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove member from project
  static async removeMember(req, res, next) {
    try {
      const projectId = req.params.id;
      const memberId = req.params.memberId;
      const currentUserId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Check permission
      if (!project.canEdit(currentUserId)) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      // Find member index
      const memberIndex = project.members.findIndex(
        (member) => member.user.toString() === memberId,
      );

      if (memberIndex === -1) {
        return res.status(404).json({
          message: "Member not found",
        });
      }

      // Cannot remove owner
      if (project.members[memberIndex].role === "owner") {
        return res.status(400).json({
          message: "Cannot remove project owner",
        });
      }

      // Cannot remove yourself if you're the only editor/owner
      if (memberId === currentUserId) {
        const editors = project.members.filter((member) =>
          ["owner", "editor"].includes(member.role),
        );
        if (editors.length <= 1) {
          return res.status(400).json({
            message: "Cannot remove yourself as the only editor/owner",
          });
        }
      }

      // Remove member
      project.members.splice(memberIndex, 1);
      await project.save();

      return res.json({
        message: "Member removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Search users for adding to project
  static async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      const currentUserId = req.user.userId;

      if (!q || q.length < 2) {
        return res.json({ data: [] });
      }

      const users = await User.find({
        _id: { $ne: currentUserId },
        isActive: true,
        $or: [
          { email: { $regex: q, $options: "i" } },
          { fullName: { $regex: q, $options: "i" } },
        ],
      })
        .select("email fullName avatarUrl")
        .limit(10);

      return res.json({ data: users });
    } catch (error) {
      next(error);
    }
  }

  // Archive project
  static async archiveProject(req, res, next) {
    try {
      const projectId = req.params.id;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Check permission - only owner can archive
      const isOwner = project.owner.toString() === userId;
      if (!isOwner) {
        return res.status(403).json({
          message: "Only project owner can archive project",
        });
      }

      project.isArchived = true;
      await project.save();

      // Clear cache
      cache.del(`user:${userId}:projects`);

      return res.json({
        message: "Project archived successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProjectController;
