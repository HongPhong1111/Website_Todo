const express = require('express');

const { authRequired } = require('../middlewares/auth');
const { query } = require('../config/db');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      'SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50',
      { userId }
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const id = Number(req.params.id);
    await query(
      'UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :userId',
      { id, userId }
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
