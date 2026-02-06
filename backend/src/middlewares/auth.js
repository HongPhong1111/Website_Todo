const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const authRequired = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      fullName: decoded.fullName,
      avatarUrl: decoded.avatarUrl,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
      });
    }
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }
  next();
};

const projectMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(projectId);
    if (!project || !project.isMember(userId)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

const projectEditor = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(projectId);
    if (!project || !project.canEdit(userId)) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authRequired,
  adminOnly,
  projectMember,
  projectEditor,
};
