const nodemailer = require('nodemailer');
const config = require('../config/env');
const { query } = require('../config/db');

const transporter = config.mail.host ? nodemailer.createTransport(config.mail) : null;

async function sendMail(to, subject, text) {
  if (!to) return;
  if (!transporter) {
    console.log(`[mail disabled] ${to}: ${subject} - ${text}`);
    return;
  }
  await transporter.sendMail({ from: config.mail.from, to, subject, text });
}

async function notify(userId, title, message, channel = 'dashboard') {
  await query('INSERT INTO notifications (user_id,title,message,channel) VALUES (?,?,?,?)', [userId, title, message, channel]);
  const users = await query('SELECT email FROM users WHERE id=?', [userId]);
  if (channel === 'email' || channel === 'dashboard') await sendMail(users[0]?.email, title, message);
}

module.exports = { sendMail, notify };
