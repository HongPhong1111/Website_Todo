const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { z } = require('zod');

const { env } = require('../config/env');
const { query } = require('../config/db');
const { signAccessToken } = require('../utils/jwt');

const router = express.Router();
const googleClient = new OAuth2Client(env.google.clientId);

router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(1).optional(),
    });
    const body = schema.parse(req.body);

    const existed = await query('SELECT id FROM users WHERE email = :email LIMIT 1', {
      email: body.email,
    });
    if (existed.length) return res.status(409).json({ message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash, full_name, provider, role) VALUES (:email, :passwordHash, :fullName, \'local\', \'user\')',
      { email: body.email, passwordHash, fullName: body.fullName || null }
    );

    const userId = result.insertId;
    const token = signAccessToken({ userId, role: 'user' });
    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const body = schema.parse(req.body);

    const rows = await query(
      'SELECT id, password_hash, role, is_active FROM users WHERE email = :email LIMIT 1',
      { email: body.email }
    );

    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'User disabled' });
    if (!user.password_hash) return res.status(401).json({ message: 'Use Google login for this account' });

    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signAccessToken({ userId: user.id, role: user.role });
    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const schema = z.object({ idToken: z.string().min(1) });
    const body = schema.parse(req.body);

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: body.idToken,
        audience: env.google.clientId,
      });
    } catch (error) {
      console.error('Google token verification error:', error);
      return res.status(400).json({ message: 'Invalid Google token', error: error.message });
    }

    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) return res.status(400).json({ message: 'Google token missing email' });

    const fullName = payload?.name || null;
    const avatarUrl = payload?.picture || null;

    const found = await query('SELECT id, role, is_active FROM users WHERE email = :email LIMIT 1', { email });

    let userId;
    let role;

    if (!found.length) {
      const result = await query(
        "INSERT INTO users (email, full_name, avatar_url, provider, role) VALUES (:email, :fullName, :avatarUrl, 'google', 'user')",
        { email, fullName, avatarUrl }
      );
      userId = result.insertId;
      role = 'user';
    } else {
      if (!found[0].is_active) return res.status(403).json({ message: 'User disabled' });
      userId = found[0].id;
      role = found[0].role;

      await query(
        'UPDATE users SET full_name = COALESCE(:fullName, full_name), avatar_url = COALESCE(:avatarUrl, avatar_url) WHERE id = :id',
        { id: userId, fullName, avatarUrl }
      );
    }

    const token = signAccessToken({ userId, role });
    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
