const { verifyAccessToken } = require('./utils/jwt');

const userSocketMap = new Map();

function registerSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      return next();
    } catch (e) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user.userId);
    userSocketMap.set(userId, socket.id);

    socket.on('disconnect', () => {
      const current = userSocketMap.get(userId);
      if (current === socket.id) userSocketMap.delete(userId);
    });
  });

  io.emitToUser = (userId, event, payload) => {
    const sid = userSocketMap.get(String(userId));
    if (sid) io.to(sid).emit(event, payload);
  };
}

module.exports = { registerSocket };
