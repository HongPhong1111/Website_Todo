const express = require("express");
const Notification = require("../models/Notification");
const { authRequired } = require("../middlewares/auth");
const { z } = require("zod");

const router = express.Router();
router.use(authRequired);

// Get notifications with pagination and filters
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 50,
      unread,
      type,
      priority,
      startDate,
      endDate,
    } = req.query;

    // Build query
    const query = { user: userId };

    // Filter by read status
    if (unread !== undefined) {
      query.isRead = unread === "true" ? false : true;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        user: userId,
        isRead: false,
      }),
    ]);

    // Format response
    const formattedNotifications = notifications.map((notification) => ({
      ...notification,
      id: notification._id,
      _id: undefined,
      __v: undefined,
    }));

    res.json({
      data: formattedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.post("/:id/read", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.json({
      ok: true,
      data: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.post("/read-all", async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      {
        user: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    res.json({
      ok: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.json({
      ok: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Archive notification
router.post("/:id/archive", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
      },
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.json({
      ok: true,
      data: {
        id: notification._id,
        isArchived: notification.isArchived,
        archivedAt: notification.archivedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get notification stats
router.get("/stats", async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const stats = await Notification.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          byType: [{ $group: { _id: "$type", count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
          readStatus: [{ $group: { _id: "$isRead", count: { $sum: 1 } } }],
          recentActivity: [
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
            { $sort: { _id: -1 } },
            { $limit: 7 },
          ],
          unreadCount: [{ $match: { isRead: false } }, { $count: "count" }],
        },
      },
    ]);

    res.json({
      data: stats[0] || {},
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update notifications
router.post("/bulk-update", async (req, res, next) => {
  try {
    const schema = z.object({
      notificationIds: z.array(z.string()),
      action: z.enum(["read", "unread", "archive", "delete"]),
    });

    const { notificationIds, action } = schema.parse(req.body);
    const userId = req.user.userId;

    let result;
    switch (action) {
      case "read":
        result = await Notification.updateMany(
          {
            _id: { $in: notificationIds },
            user: userId,
          },
          {
            isRead: true,
            readAt: new Date(),
          },
        );
        break;
      case "unread":
        result = await Notification.updateMany(
          {
            _id: { $in: notificationIds },
            user: userId,
          },
          {
            isRead: false,
            readAt: null,
          },
        );
        break;
      case "archive":
        result = await Notification.updateMany(
          {
            _id: { $in: notificationIds },
            user: userId,
          },
          {
            isArchived: true,
            archivedAt: new Date(),
          },
        );
        break;
      case "delete":
        result = await Notification.deleteMany({
          _id: { $in: notificationIds },
          user: userId,
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    res.json({
      ok: true,
      message: `${result.modifiedCount || result.deletedCount} notifications updated`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
