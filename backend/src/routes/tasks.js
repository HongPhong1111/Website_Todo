const express = require('express');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const multer = require('multer');

const { query } = require('../config/db');
const { authRequired } = require('../middlewares/auth');
const { cache } = require('../config/cache');
const { createNotificationForUsers } = require('../services/notifications');

const router = express.Router();
router.use(authRequired);

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/by-project/:projectId', async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const userId = req.user.userId;

    const member = await query(
      'SELECT 1 FROM project_members WHERE project_id = :projectId AND user_id = :userId LIMIT 1',
      { projectId, userId }
    );
    if (!member.length) return res.status(403).json({ message: 'Forbidden' });

    const cacheKey = `project:${projectId}:tasks`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json({ data: hit, cached: true });

    const rows = await query(
      'SELECT * FROM tasks WHERE project_id = :projectId ORDER BY updated_at DESC',
      { projectId }
    );

    cache.set(cacheKey, rows, 30);
    return res.json({ data: rows, cached: false });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    const rows = await query(
      `SELECT t.*, u1.email as created_by_email, u2.email as assigned_to_email
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       JOIN users u1 ON u1.id = t.created_by
       LEFT JOIN users u2 ON u2.id = t.assigned_to
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    return res.json({ data: rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    const rows = await query(
      `SELECT 1
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );
    if (!rows.length) return res.status(403).json({ message: 'Forbidden' });

    const comments = await query(
      `SELECT c.*, u.email, u.full_name
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = :taskId
       ORDER BY c.created_at ASC`,
      { taskId }
    );

    return res.json({ data: comments });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;
    const schema = z.object({ content: z.string().min(1) });
    const body = schema.parse(req.body);

    const rows = await query(
      `SELECT t.project_id
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );
    if (!rows.length) return res.status(403).json({ message: 'Forbidden' });

    const projectId = rows[0].project_id;
    const result = await query(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES (:taskId, :userId, :content)',
      { taskId, userId, content: body.content }
    );

    cache.del(`project:${projectId}:tasks`);
    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/attachments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    const rows = await query(
      `SELECT 1
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );
    if (!rows.length) return res.status(403).json({ message: 'Forbidden' });

    const files = await query(
      `SELECT a.*, u.email, u.full_name
       FROM task_attachments a
       JOIN users u ON u.id = a.user_id
       WHERE a.task_id = :taskId
       ORDER BY a.created_at DESC`,
      { taskId }
    );

    const data = files.map((f) => ({
      ...f,
      url: `/uploads/${path.basename(f.storage_path)}`,
    }));

    return res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/attachments', upload.single('file'), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ message: 'Missing file' });

    const rows = await query(
      `SELECT t.project_id
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );
    if (!rows.length) return res.status(403).json({ message: 'Forbidden' });

    const projectId = rows[0].project_id;

    const result = await query(
      `INSERT INTO task_attachments (task_id, user_id, original_name, mime_type, size_bytes, storage_path)
       VALUES (:taskId, :userId, :originalName, :mimeType, :sizeBytes, :storagePath)`,
      {
        taskId,
        userId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
      }
    );

    cache.del(`project:${projectId}:tasks`);

    const members = await query(
      'SELECT user_id FROM project_members WHERE project_id = :projectId AND user_id <> :me',
      { projectId, me: userId }
    );
    const userIds = members.map((m) => m.user_id);
    if (userIds.length) {
      await createNotificationForUsers(userIds, {
        type: 'task_attachment',
        title: `New attachment on task #${taskId}`,
        payload: { taskId, projectId },
      });
    }

    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      projectId: z.number().int().positive(),
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      dueDate: z.string().datetime().optional(),
      assignedTo: z.number().int().positive().nullable().optional(),
    });
    const body = schema.parse(req.body);

    const userId = req.user.userId;
    const member = await query(
      'SELECT 1 FROM project_members WHERE project_id = :projectId AND user_id = :userId LIMIT 1',
      { projectId: body.projectId, userId }
    );
    if (!member.length) return res.status(403).json({ message: 'Forbidden' });

    const result = await query(
      `INSERT INTO tasks (project_id, title, description, status, priority, due_date, created_by, assigned_to)
       VALUES (:projectId, :title, :description, 'todo', :priority, :dueDate, :createdBy, :assignedTo)`,
      {
        projectId: body.projectId,
        title: body.title,
        description: body.description || null,
        priority: body.priority || 'medium',
        dueDate: body.dueDate || null,
        createdBy: userId,
        assignedTo: body.assignedTo ?? null,
      }
    );

    cache.del(`project:${body.projectId}:tasks`);

    if (body.assignedTo) {
      await createNotificationForUsers([body.assignedTo], {
        type: 'task_assigned',
        title: `You were assigned a task in project #${body.projectId}`,
        payload: { taskId: result.insertId, projectId: body.projectId },
      });
    }

    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(['todo', 'in_progress', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      dueDate: z.string().datetime().nullable().optional(),
      assignedTo: z.number().int().positive().nullable().optional(),
    });
    const body = schema.parse(req.body);

    const userId = req.user.userId;
    const rows = await query(
      `SELECT t.project_id
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id
       WHERE t.id = :taskId AND pm.user_id = :userId
       LIMIT 1`,
      { taskId, userId }
    );
    if (!rows.length) return res.status(403).json({ message: 'Forbidden' });

    const patch = {
      title: body.title ?? null,
      description: body.description ?? null,
      status: body.status ?? null,
      priority: body.priority ?? null,
      due_date: body.dueDate === undefined ? undefined : body.dueDate,
      assigned_to: body.assignedTo === undefined ? undefined : body.assignedTo,
    };

    const sets = [];
    const params = { taskId };

    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      sets.push(`${k} = :${k}`);
      params[k] = v;
    });

    if (!sets.length) return res.json({ ok: true });

    await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = :taskId`, params);

    cache.del(`project:${rows[0].project_id}:tasks`);

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
