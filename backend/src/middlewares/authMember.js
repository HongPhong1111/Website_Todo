const Project = require("../models/Project");

const loadProject = async (req, res, next) => {
  const project = await Project.findOne({
    _id: req.params.projectId,
    isDeleted: false,
  });

  if (!project) {
    return res
      .status(404)
      .json({ success: false, message: "Project không tồn tại" });
  }

  req.project = project;
  req.params.projectId = project._id.toString();
  next();
};

const isProjectMember = (req, res, next) => {
  const userId = req.user.id;
  const project = req.project;

  if (!project.isMember(userId)) {
    return res
      .status(403)
      .json({ success: false, message: "Bạn không thuộc project này" });
  }

  next();
};

const isProjectOwner = (req, res, next) => {
  const userId = req.user.id;
  const project = req.project;

  if (!project.isOwner(userId)) {
    return res.status(403).json({
      success: false,
      message: "Bạn không phải là owner của project này",
    });
  }

  next();
};

module.exports = { isProjectMember, isProjectOwner, loadProject };
