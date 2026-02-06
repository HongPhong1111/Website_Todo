const express = require("express");
const { z } = require("zod");
const User = require("../../models/User");
const Project = require("../../models/Project");
const Task = require("../../models/Task");
const Notification = require("../../models/Notification");
const { authRequired, adminOnly } = require("../../middlewares/auth");

const router = express.Router();
router.use(authRequired);
router.use(adminOnly);

// Admin dashboard statistics
router.get("/dashboard", async (req, res, next) => {
  try {
    const [
      userStats,
      projectStats,
      taskStats,
      recentUsers,
      recentProjects,
      systemMetrics,
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            byProvider: [{ $group: { _id: "$provider", count: { $sum: 1 } } }],
            byRole: [{ $group: { _id: "$role", count: { $sum: 1 } } }],
            activeStatus: [
              { $group: { _id: "$isActive", count: { $sum: 1 } } },
            ],
          },
        },
      ]),

      // Project statistics
      Project.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            archivedStatus: [
              { $group: { _id: "$isArchived", count: { $sum: 1 } } },
            ],
            byMemberCount: [
              { $project: { memberCount: { $size: "$members" } } },
              {
                $bucket: {
                  groupBy: "$memberCount",
                  boundaries: [0, 1, 3, 5, 10, 100],
                  default: "10+",
                  output: {
                    count: { $sum: 1 },
                  },
                },
              },
            ],
          },
        },
      ]),

      // Task statistics
      Task.aggregate([
        { $match: { isDeleted: false } },
        {
          $facet: {
            total: [{ $count: "count" }],
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
            completionRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  completed: {
                    $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
                  },
                },
              },
            ],
          },
        },
      ]),

      // Recent users (last 10)
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("email fullName role provider isActive createdAt"),

      // Recent projects (last 10)
      Project.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name description owner members isArchived createdAt")
        .populate("owner", "email fullName"),

      // System metrics
      Promise.all([
        Notification.countDocuments(),
        Task.countDocuments({ isDeleted: false }),
        User.countDocuments({
          lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]),
    ]);

    res.json({
      statistics: {
        users: {
          total: userStats[0]?.total[0]?.count || 0,
          byProvider: userStats[0]?.byProvider || [],
          byRole: userStats[0]?.byRole || [],
          activeStatus: userStats[0]?.activeStatus || [],
        },
        projects: {
          total: projectStats[0]?.total[0]?.count || 0,
          archivedStatus: projectStats[0]?.archivedStatus || [],
          byMemberCount: projectStats[0]?.byMemberCount || [],
        },
        tasks: {
          total: taskStats[0]?.total[0]?.count || 0,
          byStatus: taskStats[0]?.byStatus || [],
          byPriority: taskStats[0]?.byPriority || [],
          completionRate: taskStats[0]?.completionRate[0] || {
            total: 0,
            completed: 0,
          },
        },
      },
      recentActivity: {
        users: recentUsers,
        projects: recentProjects,
      },
      systemMetrics: {
        totalNotifications: systemMetrics[0],
        totalTasks: systemMetrics[1],
        activeUsersLast7Days: systemMetrics[2],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all users with pagination and filters
router.get("/users", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      provider = "",
      isActive = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Provider filter
    if (provider) {
      query.provider = provider;
    }

    // Active status filter
    if (isActive !== "") {
      query.isActive = isActive === "true";
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    // Format response
    const formattedUsers = users.map((user) => ({
      ...user,
      id: user._id,
      _id: undefined,
      __v: undefined,
    }));

    res.json({
      data: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch("/users/:id", async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["user", "admin"]).optional(),
      isActive: z.boolean().optional(),
      fullName: z.string().optional(),
    });

    const userId = req.params.id;
    const updates = schema.parse(req.body);

    // Prevent self-demotion (admin cannot remove their own admin role)
    if (updates.role === "user" && userId === req.user.userId) {
      return res.status(400).json({
        message: "Cannot remove your own admin role",
      });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      ok: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (userId === req.user.userId) {
      return res.status(400).json({
        message: "Cannot delete your own account",
      });
    }

    // Find user first to check if they own any projects
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if user owns any projects
    const ownedProjectsCount = await Project.countDocuments({ owner: userId });
    if (ownedProjectsCount > 0) {
      return res.status(400).json({
        message: `Cannot delete user who owns ${ownedProjectsCount} project(s). Transfer ownership first.`,
      });
    }

    // Soft delete user
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.json({
      ok: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get all projects
router.get("/projects", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      isArchived = "",
      ownerId = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Archive filter
    if (isArchived !== "") {
      query.isArchived = isArchived === "true";
    }

    // Owner filter
    if (ownerId) {
      query.owner = ownerId;
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("owner", "email fullName")
        .populate("members.user", "email fullName")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Project.countDocuments(query),
    ]);

    // Format response
    const formattedProjects = projects.map((project) => ({
      ...project,
      id: project._id,
      _id: undefined,
      __v: undefined,
      owner: project.owner
        ? {
            id: project.owner._id,
            email: project.owner.email,
            fullName: project.owner.fullName,
          }
        : null,
      members: project.members?.map((member) => ({
        user: member.user
          ? {
              id: member.user._id,
              email: member.user.email,
              fullName: member.user.fullName,
            }
          : null,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    }));

    res.json({
      data: formattedProjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete("/projects/:id", async (req, res, next) => {
  try {
    const projectId = req.params.id;

    // Find project first
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Archive the project instead of deleting
    project.isArchived = true;
    project.archivedAt = new Date();
    project.archivedBy = req.user.userId;
    await project.save();

    // Also archive all tasks in the project
    await Task.updateMany(
      { project: projectId },
      {
        isArchived: true,
        archivedAt: new Date(),
      },
    );

    res.json({
      ok: true,
      message: "Project and its tasks archived successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get system logs/audit trail
router.get("/logs", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      type = "",
      startDate = "",
      endDate = "",
    } = req.query;

    // This would typically come from a separate AuditLog model
    // For now, we'll return recent activities from different collections

    const [userActivities, projectActivities, taskActivities] =
      await Promise.all([
        User.find()
          .sort({ updatedAt: -1 })
          .limit(10)
          .select("email updatedAt lastLoginAt")
          .lean(),
        Project.find()
          .sort({ updatedAt: -1 })
          .limit(10)
          .select("name updatedAt")
          .lean(),
        Task.find()
          .sort({ updatedAt: -1 })
          .limit(10)
          .select("title status updatedAt")
          .lean(),
      ]);

    // Combine and format activities
    const activities = [
      ...userActivities.map((activity) => ({
        type: "user",
        action: "updated",
        target: activity.email,
        timestamp: activity.updatedAt,
        details: {
          lastLogin: activity.lastLoginAt,
        },
      })),
      ...projectActivities.map((activity) => ({
        type: "project",
        action: "updated",
        target: activity.name,
        timestamp: activity.updatedAt,
      })),
      ...taskActivities.map((activity) => ({
        type: "task",
        action: "updated",
        target: activity.title,
        timestamp: activity.updatedAt,
        details: {
          status: activity.status,
        },
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);

    res.json({
      data: activities,
      pagination: {
        page: 1,
        limit: 30,
        total: activities.length,
        pages: 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed project analytics
router.get("/analytics/projects", async (req, res, next) => {
  try {
    const { timeframe = "30days" } = req.query;

    let days;
    switch (timeframe) {
      case "7days":
        days = 7;
        break;
      case "30days":
        days = 30;
        break;
      case "90days":
        days = 90;
        break;
      default:
        days = 30;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Project.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $facet: {
          // Projects created over time
          creationTrend: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          // Average members per project
          memberStats: [
            {
              $project: {
                memberCount: { $size: "$members" },
              },
            },
            {
              $group: {
                _id: null,
                avgMembers: { $avg: "$memberCount" },
                maxMembers: { $max: "$memberCount" },
                minMembers: { $min: "$memberCount" },
              },
            },
          ],
          // Most active projects (by task count)
          activeProjects: [
            {
              $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "project",
                as: "tasks",
              },
            },
            {
              $project: {
                name: 1,
                taskCount: { $size: "$tasks" },
                completedTasks: {
                  $size: {
                    $filter: {
                      input: "$tasks",
                      as: "task",
                      cond: { $eq: ["$$task.status", "done"] },
                    },
                  },
                },
              },
            },
            { $sort: { taskCount: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    res.json({
      data: analytics[0] || {},
      timeframe: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
