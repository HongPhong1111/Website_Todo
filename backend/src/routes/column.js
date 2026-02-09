// routes/column.js
const express = require("express");
const ColumnController = require("../controllers/columnController");
const { authRequired } = require("../middlewares/auth");

const router = express.Router();

router.use(authRequired);

// Lấy tất cả cột của project
router.get("/:projectId", ColumnController.getColumnsByProject);

// Tạo cột mới
router.post("/", ColumnController.createColumn);

// Cập nhật cột
router.put("/:id", ColumnController.updateColumn);

// Xóa cột (soft delete)
router.delete("/:id", ColumnController.deleteColumn);

// Khôi phục cột đã xóa
router.post("/:id/restore", ColumnController.restoreColumn);

// Cập nhật vị trí của nhiều cột
router.post("/update-positions", ColumnController.updateColumnPositions);

module.exports = router;
