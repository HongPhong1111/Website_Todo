const { verifyToken } = require("./utils/jwt");

const userSocketMap = new Map(); // userId -> Set(socketId)

function registerSocket(io) {
  // 🔐 Middleware xác thực JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.log("❌ Socket missing token");
      return next(new Error("Unauthorized"));
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      console.log("❌ Invalid token");
      return next(new Error("Unauthorized"));
    }

    socket.user = payload;
    next();
  });

  // 🔌 Khi client connect
  io.on("connection", (socket) => {
    const userId = String(socket.user.userId);
    console.log(
      "🟢 Socket connected: userid: ",
      userId,
      " - socketId:",
      socket.id,
    );

    // Hỗ trợ nhiều tab / nhiều thiết bị
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    // 🔌 Khi client disconnect
    socket.on("disconnect", () => {
      console.log(
        "🔴 Socket disconnected: userid: ",
        userId,
        " - socketId:",
        socket.id,
      );

      const set = userSocketMap.get(userId);
      if (!set) return;

      set.delete(socket.id);
      if (set.size === 0) {
        userSocketMap.delete(userId);
      }
    });

    // 📁 Tham gia phòng dự án
    socket.on("join-project", (projectId) => {
      socket.join(`project-${projectId}`); // Tham gia phòng dự án (Tạo nếu chưa có) Theo ID dự án có tên định dạng project-<projectId>
      console.log(`Client ${socket.id} joined project-${projectId}`);
    });

    // 📁 Rời phòng dự án
    socket.on("leave-project", (projectId) => {
      socket.leave(`project-${projectId}`);
      console.log(`Client ${socket.id} left project-${projectId}`);
    });

    // 🔄 Cập nhật task trong dự án
    socket.on("task-updated", (data) => {
      const { projectId, taskId, updates } = data;
      // Broadcast cho tất cả client khác trong project
      socket.to(`project-${projectId}`).emit("task-changed-broadcast", {
        // Gửi đến các client khác trong phòng dự án
        taskId,
        updates,
        updatedBy: socket.id,
      });
      console.log(`Task ${taskId} updated in project ${projectId}`);
    });

    // Di chuyển task
    socket.on("task-moved", (data) => {
      const { projectId, taskId, fromColumn, toColumn, position } = data;
      socket.to(`project-${projectId}`).emit("task-moved-broadcast", {
        taskId,
        fromColumn,
        toColumn,
        position,
        movedBy: socket.id,
      });
      console.log(`Task ${taskId} moved in project ${projectId}`);
    });
    // Sắp xếp lại task
    socket.on("task-reordered", (data) => {
      const { projectId, taskId, position, columnId } = data;
      socket.to(`project-${projectId}`).emit("task-reordered-broadcast", {
        taskId,
        position,
        columnId,
        reorderedBy: socket.id,
      });
      console.log(`Task ${taskId} reordered in project ${projectId}`);
    });

    // Cập nhật cột
    socket.on("column-updated", (data) => {
      const { projectId, columnId, updates } = data;
      socket.to(`project-${projectId}`).emit("column-changed-broadcast", {
        columnId,
        updates,
        updatedBy: socket.id,
      });
      console.log(`Column ${columnId} updated in project ${projectId}`);
    });

    // Sắp xếp lại cột
    socket.on("columns-reordered", (data) => {
      const { projectId, columns } = data;
      socket.to(`project-${projectId}`).emit("columns-reordered-broadcast", {
        columns,
        reorderedBy: socket.id,
      });
      console.log(`Columns reordered in project ${projectId}`);
    });

    // Task tạo mới
    socket.on("task-created", (data) => {
      const { projectId, task, columnId } = data;
      socket.to(`project-${projectId}`).emit("task-created-broadcast", {
        task,
        columnId,
        createdBy: socket.id,
      });
      console.log(`New task created in project ${projectId}`);
    });

    // Column tạo mới
    socket.on("column-created", (data) => {
      const { projectId, column } = data;
      socket.to(`project-${projectId}`).emit("column-created-broadcast", {
        column,
        createdBy: socket.id,
      });
      console.log(`New column created in project ${projectId}`);
    });

    // Xóa task
    socket.on("task-deleted", (data) => {
      const { projectId, taskId } = data;
      // Gửi đến các client khác trong phòng dự án, nhận diện sự kiện task-deleted-broadcast ở client
      socket.to(`project-${projectId}`).emit("task-deleted-broadcast", {
        taskId,
        deletedBy: socket.id,
      });
      console.log(`Task ${taskId} deleted in project ${projectId}`);
    });

    // Xóa column
    socket.on("column-deleted", (data) => {
      const { projectId, columnId } = data;
      socket.to(`project-${projectId}`).emit("column-deleted-broadcast", {
        columnId,
        deletedBy: socket.id,
      });
      console.log(`Column ${columnId} deleted in project ${projectId}`);
    });
  });

  // 📩 Gửi thông báo tới 1 user (tất cả tab)
  io.emitToUser = (userId, event, payload) => {
    const sockets = userSocketMap.get(String(userId));
    if (!sockets) return;

    for (const sid of sockets) {
      io.to(sid).emit(event, payload);
    }
  };
}

module.exports = { registerSocket };
