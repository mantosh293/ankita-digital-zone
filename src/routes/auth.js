const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/db');
const { publicUser } = require('../utils/helpers');
const { sendMail, notify } = require('../services/notificationService');
const config = require('../config/env');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/register', async (req, res) => {
  const { role = 'customer', name, fatherName, dob, gender, mobile, email, password, state, district, address } = req.body;
  if (!['customer', 'creator'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
  const exists = await query('SELECT id FROM users WHERE email=? OR mobile=? LIMIT 1', [email, mobile || '']);
  if (exists.length) return res.status(409).json({ message: 'Account already exists' });
  const hash = await bcrypt.hash(password, 12);
  const status = role === 'creator' ? 'pending' : 'active';
  const result = await query('INSERT INTO users (role,name,father_name,dob,gender,mobile,email,password_hash,state,district,address,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [role, name, fatherName || null, dob || null, gender || null, mobile || null, email, hash, state || null, district || null, address || null, status]);
  const token = crypto.randomBytes(32).toString('hex');
  await query('INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 24 HOUR))', [result.insertId, token]);
  await sendMail(email, 'Verify your Ankita Cyber Cafe account', `${config.appUrl}/api/auth/verify-email/${token}`);
  req.session.userId = result.insertId;
  const users = await query('SELECT * FROM users WHERE id=?', [result.insertId]);
  res.status(201).json({ user: publicUser(users[0]), message: role === 'creator' ? 'Creator registered and waiting for admin approval' : 'Registration successful' });
});

router.post('/login', async (req, res) => {
  const { login, password, role } = req.body;
  const users = await query('SELECT * FROM users WHERE (email=? OR mobile=?) AND role=? AND status != "deleted" LIMIT 1', [login, login, role]);
  const user = users[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ message: 'Invalid login details' });
  if (user.status === 'suspended' || user.status === 'pending') return res.status(403).json({ message: `Account is ${user.status}` });
  req.session.userId = user.id;
  res.json({ user: publicUser(user), message: 'Login successful' });
});

router.post('/logout', (req, res) => req.session.destroy(() => res.json({ message: 'Logged out' })));

router.post('/forgot-password', async (req, res) => {
  const users = await query('SELECT id,email FROM users WHERE email=? LIMIT 1', [req.body.email]);
  if (users[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    await query('INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 1 HOUR))', [users[0].id, token]);
    await sendMail(users[0].email, 'Reset your password', `${config.appUrl}/reset-password?token=${token}`);
  }
  res.json({ message: 'If this email exists, a reset link has been sent' });
});

router.post('/reset-password', async (req, res) => {
  const rows = await query('SELECT * FROM password_resets WHERE token=? AND used_at IS NULL AND expires_at > NOW() LIMIT 1', [req.body.token]);
  if (!rows[0]) return res.status(400).json({ message: 'Invalid or expired reset token' });
  await query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(req.body.password, 12), rows[0].user_id]);
  await query('UPDATE password_resets SET used_at=NOW() WHERE id=?', [rows[0].id]);
  res.json({ message: 'Password reset successful' });
});

router.get('/verify-email/:token', async (req, res) => {
  const rows = await query('SELECT * FROM password_resets WHERE token=? AND used_at IS NULL AND expires_at > NOW() LIMIT 1', [req.params.token]);
  if (!rows[0]) return res.status(400).send('Invalid or expired verification link');
  await query('UPDATE users SET email_verified_at=NOW() WHERE id=?', [rows[0].user_id]);
  await query('UPDATE password_resets SET used_at=NOW() WHERE id=?', [rows[0].id]);
  res.send('Email verified. You can close this page and login.');
});

router.patch('/profile', requireAuth, async (req, res) => {
  const { name, mobile, state, district, address } = req.body;
  await query('UPDATE users SET name=?, mobile=?, state=?, district=?, address=? WHERE id=?', [name, mobile, state, district, address, req.user.id]);
  const users = await query('SELECT * FROM users WHERE id=?', [req.user.id]);
  res.json({ user: publicUser(users[0]) });
});

module.exports = router;
