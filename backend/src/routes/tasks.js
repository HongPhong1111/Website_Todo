const express = require("express");
const TaskController = require("../controllers/taskController");
const { authRequired } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");

const router = express.Router();
router.use(authRequired);

// GET
router.get("/by-project/:projectId", TaskController.getTasksByProject);
router.get("/:id/comments", TaskController.getComments);
router.get("/:id/attachments", TaskController.getAttachments);
router.get("/:id", TaskController.getTask);

// POST

router.post("/:id/comments", TaskController.addComment);
// router.post(
//   "/:id/attachments",
//   upload.single("file"),
//   TaskController.uploadAttachment,
// );
router.post("/", TaskController.createTask);

// DELETE
router.delete("/:id", TaskController.deleteTask);

// PATCH

router.patch("/:id", TaskController.updateTask);

module.exports = router;
