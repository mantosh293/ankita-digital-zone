const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const config = require('./config/env');
const { currentUser } = require('./middleware/auth');
const { sanitizeBody } = require('./utils/helpers');

const app = express();
const store = new MySQLStore({}, require('./config/db').pool);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ name: 'ankita.sid', secret: config.sessionSecret, resave: false, saveUninitialized: false, store, cookie: { httpOnly: true, sameSite: 'lax', secure: config.env === 'production', maxAge: 1000 * 60 * 60 * 8 } }));
app.use(currentUser);
app.use('/api', sanitizeBody);
app.use(express.static(path.join(config.root, 'public')));
app.use('/storage/uploads', express.static(config.uploadDir));
app.use('/storage/final', express.static(config.finalWorkDir));

const csrfProtection = csrf({ cookie: false });
app.get('/api/csrf-token', csrfProtection, (req, res) => res.json({ csrfToken: req.csrfToken() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/portal'));
app.use('/api/admin', require('./routes/admin'));
app.use(require('./routes/site'));
app.get('*', (_req, res) => res.sendFile(path.join(config.root, 'public/index.html')));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;


