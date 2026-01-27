const express = require('express');
const { z } = require('zod');

const { query } = require('../config/db');
const { authRequired } = require('../middlewares/auth');
const { createNotificationForUsers } = require('../services/notifications');

const router = express.Router();
router.use(authRequired);

// Get all teams the user is a member of
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      `SELECT t.*, tm.role,
              (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) as member_count
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = :userId
       ORDER BY t.updated_at DESC`,
      { userId }
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// Create a new team
router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(1).max(191) });
    const body = schema.parse(req.body);

    const ownerUserId = req.user.userId;
    const result = await query(
      'INSERT INTO teams (name, owner_user_id) VALUES (:name, :ownerUserId)',
      { name: body.name, ownerUserId }
    );
    const teamId = result.insertId;

    // Add owner as team manager
    await query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (:teamId, :userId, 'manager')",
      { teamId, userId: ownerUserId }
    );

    res.status(201).json({ id: teamId });
  } catch (e) {
    next(e);
  }
});

// Get team details
router.get('/:id', async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const userId = req.user.userId;

    // Check if user is a member of this team
    const memberCheck = await query(
      "SELECT 1 FROM team_members WHERE team_id = :teamId AND user_id = :userId LIMIT 1",
      { teamId, userId }
    );
    if (!memberCheck.length) return res.status(403).json({ message: 'Forbidden' });

    const team = await query(
      `SELECT t.*, tm.role as user_role
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE t.id = :teamId AND tm.user_id = :userId`,
      { teamId, userId }
    );

    if (!team.length) return res.status(404).json({ message: 'Team not found' });
    res.json({ data: team[0] });
  } catch (e) {
    next(e);
  }
});

// Add member to team
router.post('/:id/members', async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const schema = z.object({ 
      userId: z.number().int().positive(), 
      role: z.enum(['member', 'manager']).default('member') 
    });
    const body = schema.parse(req.body);

    const me = req.user.userId;

    // Check if current user is a manager or owner of the team
    const can = await query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.team_id = :teamId AND tm.user_id = :me 
       AND (tm.role = 'manager' OR t.owner_user_id = :me)
       LIMIT 1`,
      { teamId, me }
    );
    if (!can.length) return res.status(403).json({ message: 'Forbidden' });

    await query(
      'INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (:teamId, :userId, :role)',
      { teamId, userId: body.userId, role: body.role }
    );

    await createNotificationForUsers([body.userId], {
      type: 'team_added',
      title: `You were added to team`,
      payload: { teamId },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Remove member from team
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const me = req.user.userId;

    // Check if current user is a manager or owner of the team
    const can = await query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.team_id = :teamId AND tm.user_id = :me 
       AND (tm.role = 'manager' OR t.owner_user_id = :me)
       LIMIT 1`,
      { teamId, me }
    );
    if (!can.length) return res.status(403).json({ message: 'Forbidden' });

    // Prevent removing the team owner
    const ownerCheck = await query(
      "SELECT 1 FROM teams WHERE id = :teamId AND owner_user_id = :targetUserId LIMIT 1",
      { teamId, targetUserId }
    );
    if (ownerCheck.length) return res.status(400).json({ message: 'Cannot remove team owner' });

    // Remove the member
    await query(
      'DELETE FROM team_members WHERE team_id = :teamId AND user_id = :targetUserId',
      { teamId, targetUserId }
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Get team members
router.get('/:id/members', async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const userId = req.user.userId;

    // Check if user is a member of this team
    const memberCheck = await query(
      "SELECT 1 FROM team_members WHERE team_id = :teamId AND user_id = :userId LIMIT 1",
      { teamId, userId }
    );
    if (!memberCheck.length) return res.status(403).json({ message: 'Forbidden' });

    const members = await query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, tm.role, tm.created_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = :teamId
       ORDER BY tm.created_at ASC`,
      { teamId }
    );
    res.json({ data: members });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
