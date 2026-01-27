const { query } = require('../config/db');

let ioRef = null;

function bindIo(io) {
  ioRef = io;
}

async function createNotificationForUsers(userIds, { type, title, payload }) {
  for (const userId of userIds) {
    await query(
      'INSERT INTO notifications (user_id, type, title, payload) VALUES (:userId, :type, :title, :payload)',
      { userId, type, title, payload: payload ? JSON.stringify(payload) : null }
    );

    if (ioRef && ioRef.emitToUser) {
      ioRef.emitToUser(userId, 'notification', { type, title, payload });
    }
  }
}

module.exports = { bindIo, createNotificationForUsers };
