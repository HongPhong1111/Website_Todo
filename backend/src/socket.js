// const { verifyToken } = require("./utils/jwt");

// const userSocketMap = new Map();

// function registerSocket(io) {
//   io.use((socket, next) => {
//     const token = socket.handshake.auth?.token;
//     if (!token) return next(new Error("Unauthorized"));

//     try {
//       const payload = verifyToken(token);
//       socket.user = payload;
//       return next();
//     } catch (e) {
//       return next(new Error("Unauthorized"));
//     }
//   });

//   io.on("connection", (socket) => {
//     const userId = String(socket.user.userId);
//     userSocketMap.set(userId, socket.id);

//     socket.on("disconnect", () => {
//       const current = userSocketMap.get(userId);
//       if (current === socket.id) userSocketMap.delete(userId);
//     });
//   });

//   io.emitToUser = (userId, event, payload) => {
//     const sid = userSocketMap.get(String(userId));
//     if (sid) io.to(sid).emit(event, payload);
//   };
// }

// module.exports = { registerSocket };

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
    console.log("🟢 Socket connected:", userId, socket.id);

    // Hỗ trợ nhiều tab / nhiều thiết bị
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", userId, socket.id);

      const set = userSocketMap.get(userId);
      if (!set) return;

      set.delete(socket.id);
      if (set.size === 0) {
        userSocketMap.delete(userId);
      }
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
