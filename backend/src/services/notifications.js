const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");

let ioRef = null;

function bindIo(io) {
  ioRef = io;
}

async function createNotificationForUsers(
  userIds,
  {
    type,
    title,
    message = null,
    data = {},
    priority = "medium",
    actionUrl = null,
  },
) {
  try {
    // Validate user IDs
    const validUsers = await User.find({
      _id: { $in: userIds },
      isActive: true,
    }).select("_id");

    const validUserIds = validUsers.map((user) => user._id);

    if (validUserIds.length === 0) {
      console.log("No valid users found for notification");
      return [];
    }

    // Create notifications
    const notifications = validUserIds.map((userId) => ({
      user: userId,
      type,
      title,
      message,
      data,
      priority,
      actionUrl,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Emit real-time notifications via Socket.IO
    if (ioRef) {
      createdNotifications.forEach((notification) => {
        const userRoom = `user:${notification.user}`;

        // Emit to specific user room
        ioRef.to(userRoom).emit("notification", {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          actionUrl: notification.actionUrl,
          createdAt: notification.createdAt,
          isRead: notification.isRead,
        });

        // Also emit to admin room if it's an important notification
        if (notification.priority === "high") {
          ioRef.to("admin-room").emit("admin:notification", {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            userId: notification.user,
            createdAt: notification.createdAt,
          });
        }
      });
    }

    console.log(
      `Created ${createdNotifications.length} notifications for users: ${validUserIds}`,
    );
    return createdNotifications;
  } catch (error) {
    console.error("Error creating notifications:", error);
    throw error;
  }
}

async function createNotificationForProjectMembers(
  projectId,
  notificationData,
  excludeUserIds = [],
) {
  try {
    const project = await Project.findById(projectId).populate(
      "members.user",
      "_id",
    );

    if (!project) {
      console.log(`Project ${projectId} not found`);
      return [];
    }

    const memberIds = project.members
      .map((member) => member.user._id.toString())
      .filter((userId) => !excludeUserIds.includes(userId));

    return await createNotificationForUsers(memberIds, notificationData);
  } catch (error) {
    console.error("Error creating project notifications:", error);
    throw error;
  }
}

// Clean up old notifications (older than 90 days)
async function cleanupOldNotifications() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await Notification.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
      $or: [{ isArchived: true }, { priority: "low" }],
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up old notifications:", error);
    throw error;
  }
}

module.exports = {
  bindIo,
  createNotificationForUsers,
  createNotificationForProjectMembers,
  cleanupOldNotifications,
};
