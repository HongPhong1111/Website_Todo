const express = require("express");
const router = express.Router();

// Import các routes
const authRoutes = require("./auth");
const projectRoutes = require("./projects");
const taskRoutes = require("./tasks");
const adminRoutes = require("./admin/index");
const notificationRoutes = require("./notifications");

// Sử dụng các routes
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
