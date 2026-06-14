const sanitizeHtml = require('sanitize-html');

function clean(input) {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return sanitizeHtml(input.trim(), { allowedTags: [], allowedAttributes: {} });
  if (Array.isArray(input)) return input.map(clean);
  if (typeof input === 'object') return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, clean(v)]));
  return input;
}

function sanitizeBody(req, _res, next) {
  req.body = clean(req.body || {});
  next();
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function appCode(id) {
  return `APP${String(1200 + id).padStart(4, '0')}`;
}

module.exports = { clean, sanitizeBody, publicUser, appCode };
