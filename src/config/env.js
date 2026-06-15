const path = require('path');
require('dotenv').config();

const root = path.join(__dirname, '..','..');

module.exports = {
  root,
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ankita_cyber_cafe',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: false
  },
  uploadDir: path.join(root, process.env.UPLOAD_DIR || 'storage/uploads'),
  finalWorkDir: path.join(root, process.env.FINAL_WORK_DIR || 'storage/final-work'),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || ''
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || 'false') === 'true',
    auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
    from: process.env.MAIL_FROM || 'Ankita Cyber Cafe <no-reply@localhost>'
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@ankitadigitalzone.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  }
};

