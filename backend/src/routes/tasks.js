const express = require("express");
const TaskController = require("../controllers/taskController");
const { authRequired } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");
const { isProjectMember, loadProject } = require("../middlewares/authMember");

const router = express.Router();
router.use(authRequired);

// GET
router.get(
  "/by-project/:projectId",
  //   loadProject,
  //   isProjectMember,
  TaskController.getTasksByProject,
);
router.get("/:id/comments", TaskController.getComments);
router.get("/:id/attachments", TaskController.getAttachments);
router.get("/:id", TaskController.getTask);

// POST
router.post("/update-positions", TaskController.updateTasksPosition); // Thêm route mới
router.post("/:id/comments", TaskController.addComment);

router.post("/", TaskController.createTask);

// DELETE
router.delete("/:id", TaskController.deleteTask);

// PUT
router.put("/:id", TaskController.updateTask);

module.exports = router;
