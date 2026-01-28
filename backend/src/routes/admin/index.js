const express = require("express");
const router = express.Router();

// Import các routes

const adminRoutes = require("./admin");


// Sử dụng các routes
router.use("/", adminRoutes);

module.exports = router;
