const express = require('express');
const { z } = require('zod');

const { query } = require('../config/db');
const { authRequired } = require('../middlewares/auth');
const { createNotificationForUsers } = require('../services/notifications');
const { cache } = require('../config/cache');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      `SELECT p.*, 
              (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = :userId
       ORDER BY p.updated_at DESC`,
      { userId }
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(1), description: z.string().optional() });
    const body = schema.parse(req.body);

    const ownerUserId = req.user.userId;
    const result = await query(
      'INSERT INTO projects (team_id, name, description, owner_user_id) VALUES (NULL, :name, :description, :ownerUserId)',
      { name: body.name, description: body.description || null, ownerUserId }
    );
    const projectId = result.insertId;

    await query(
      "INSERT INTO project_members (project_id, user_id, role) VALUES (:projectId, :userId, 'owner')",
      { projectId, userId: ownerUserId }
    );

    cache.del(`project:${projectId}:tasks`);

    res.status(201).json({ id: projectId });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const schema = z.object({ userId: z.number().int().positive(), role: z.enum(['viewer', 'editor']).default('viewer') });
    const body = schema.parse(req.body);

    const me = req.user.userId;

    const can = await query(
      "SELECT 1 FROM project_members WHERE project_id = :projectId AND user_id = :me AND role IN ('owner','editor') LIMIT 1",
      { projectId, me }
    );
    if (!can.length) return res.status(403).json({ message: 'Forbidden' });

    await query(
      'INSERT IGNORE INTO project_members (project_id, user_id, role) VALUES (:projectId, :userId, :role)',
      { projectId, userId: body.userId, role: body.role }
    );

    await createNotificationForUsers([body.userId], {
      type: 'project_shared',
      title: `You were added to project #${projectId}`,
      payload: { projectId },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/users/search', async (req, res, next) => {
  try {
    const queryStr = req.query.q;
    if (!queryStr || queryStr.length < 2) {
      return res.json({ data: [] });
    }

    const userId = req.user.userId;
    const rows = await query(
      `SELECT id, email, full_name, avatar_url 
       FROM users 
       WHERE (email LIKE :query OR full_name LIKE :query) 
       AND id != :userId
       AND is_active = 1
       LIMIT 10`,
      { query: `%${queryStr}%`, userId }
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/members', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.user.userId;

    // Check if user is a member of this project
    const memberCheck = await query(
      "SELECT 1 FROM project_members WHERE project_id = :projectId AND user_id = :userId LIMIT 1",
      { projectId, userId }
    );
    if (!memberCheck.length) return res.status(403).json({ message: 'Forbidden' });

    const members = await query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, pm.role, pm.created_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = :projectId
       ORDER BY pm.created_at ASC`,
      { projectId }
    );
    res.json({ data: members });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
