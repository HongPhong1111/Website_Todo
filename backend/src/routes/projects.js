const express = require("express");
const ProjectController = require("../controllers/projectController");
const { authRequired } = require("../middlewares/auth");

const router = express.Router();
router.use(authRequired);

// get
router.get("/users/search", ProjectController.searchUsers);
router.get("/:id/members", ProjectController.projectMember);
router.get("/:id", ProjectController.getProject);
router.get("/", ProjectController.getUserProjects);

// post

router.post("/:id/archive", ProjectController.archiveProject);
router.post("/:id/members", ProjectController.addMember);
router.post("/", ProjectController.createProject);

// delete
router.delete("/:id/members/:memberId", ProjectController.removeMember);

// patch
router.patch("/:id", ProjectController.updateProject);

module.exports = router;
