const express = require('express');
const { z } = require('zod');

const { authRequired, adminOnly } = require('../middlewares/auth');
const { query } = require('../config/db');

const router = express.Router();
router.use(authRequired);
router.use(adminOnly);

router.get('/dashboard', async (req, res, next) => {
  try {
    const [users] = await Promise.all([
      query('SELECT COUNT(*) as cnt FROM users', {}),
    ]);
    const projects = await query('SELECT COUNT(*) as cnt FROM projects', {});
    const tasks = await query('SELECT COUNT(*) as cnt FROM tasks', {});
    const byStatus = await query(
      'SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status',
      {}
    );

    res.json({
      users: users[0]?.cnt || 0,
      projects: projects[0]?.cnt || 0,
      tasks: tasks[0]?.cnt || 0,
      tasksByStatus: byStatus,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT id, email, full_name, provider, role, is_active, created_at FROM users ORDER BY id DESC LIMIT 200',
      {}
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      role: z.enum(['user', 'admin']).optional(),
      isActive: z.boolean().optional(),
    });
    const body = schema.parse(req.body);

    const sets = [];
    const params = { id };

    if (body.role) {
      sets.push('role = :role');
      params.role = body.role;
    }
    if (body.isActive !== undefined) {
      sets.push('is_active = :is_active');
      params.is_active = body.isActive ? 1 : 0;
    }

    if (!sets.length) return res.json({ ok: true });

    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`, params);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/projects', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT p.*, u.email as owner_email
       FROM projects p
       JOIN users u ON u.id = p.owner_user_id
       ORDER BY p.id DESC
       LIMIT 200`,
      {}
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

router.delete('/projects/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query('DELETE FROM projects WHERE id = :id', { id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
