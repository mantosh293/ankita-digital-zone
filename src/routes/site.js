const fs = require('fs');
const path = require('path');
const express = require('express');
const { query } = require('../config/db');
const { requireRole } = require('../middleware/auth');
const config = require('../config/env');

const router = express.Router();
const pages = new Map([
  ['/', 'home'], ['/home', 'home'], ['/services', 'services'], ['/pricing', 'pricing'], ['/latest-jobs', 'jobs'], ['/job-details', 'job-details'],
  ['/admit-card', 'admit_card'], ['/results', 'results'], ['/student-links', 'student_links'], ['/about-us', 'about'],
  ['/contact', 'contact'], ['/track-application', 'track']
]);

function renderIndex(res, page, user = null) {
  const file = path.join(config.root, 'public/index.html');
  const html = fs.readFileSync(file, 'utf8').replace('</head>', `<script>window.__APP_PAGE__=${JSON.stringify(page)};window.__APP_USER__=${JSON.stringify(user ? { id:user.id, name:user.name, role:user.role, email:user.email } : null)};</script></head>`);
  res.send(html);
}

async function safeQuery(sql, params = []) {
  try { return await query(sql, params); } catch (_) { return []; }
}

router.get([...pages.keys()], (req, res) => renderIndex(res, pages.get(req.path) || 'home', req.user));
router.get('/admin/dashboard', (req, res) => renderIndex(res, req.user?.role === 'admin' ? 'admin-dashboard' : 'login-admin', req.user));
router.get('/customer/dashboard', (req, res) => renderIndex(res, req.user?.role === 'customer' ? 'customer-dashboard' : 'login-customer', req.user));
router.get('/creator/dashboard', (req, res) => renderIndex(res, req.user?.role === 'creator' ? 'creator-dashboard' : 'login-creator', req.user));

router.get('/api/public/bootstrap', async (_req, res) => {
  const [cms, services, heroBanners, jobs, admitCards, results, studentLinks] = await Promise.all([
    query('SELECT * FROM cms_items WHERE status="published" AND type IN ("homepage","about","contact") ORDER BY type,id DESC'),
    query('SELECT *, name service_name, fee price, COALESCE(description, required_documents) description FROM services WHERE status="active" ORDER BY category,name'),
    safeQuery('SELECT * FROM hero_banners WHERE status="active" ORDER BY display_order,id DESC'),
    safeQuery('SELECT * FROM jobs WHERE status="published" ORDER BY id DESC'),
    safeQuery('SELECT * FROM admit_cards WHERE status="published" ORDER BY id DESC'),
    safeQuery('SELECT * FROM results WHERE status="published" ORDER BY id DESC'),
    safeQuery('SELECT * FROM student_links WHERE status="published" ORDER BY id DESC')
  ]);
  res.json({ cms, services, heroBanners, jobs, admitCards, results, studentLinks });
});

router.get('/api/public/:type', async (req, res) => {
  const type = req.params.type;
  if (type === 'jobs') return res.json({ items: await safeQuery('SELECT *, description body FROM jobs WHERE status="published" ORDER BY id DESC') });
  if (type === 'admit_cards') return res.json({ items: await safeQuery('SELECT id, exam_name title, description body, exam_date, download_link url, image_path, status, created_at FROM admit_cards WHERE status="published" ORDER BY id DESC') });
  if (type === 'results') return res.json({ items: await safeQuery('SELECT id, exam_name title, description body, result_date, result_link url, image_path, status, created_at FROM results WHERE status="published" ORDER BY id DESC') });
  if (type === 'student_links') return res.json({ items: await safeQuery('SELECT id, title, description body, url, logo image_path, status, created_at FROM student_links WHERE status="published" ORDER BY id DESC') });
  if (type === 'banners') return res.json({ items: await safeQuery('SELECT * FROM hero_banners WHERE status="active" ORDER BY display_order,id DESC') });
  const typeMap = { about:'about', contact:'contact', homepage:'homepage' };
  const cmsType = typeMap[type];
  if (!cmsType) return res.status(404).json({ message: 'Content type not found' });
  res.json({ items: await query('SELECT * FROM cms_items WHERE type=? AND status="published" ORDER BY id DESC', [cmsType]) });
});

router.post('/api/contact', async (req, res) => {
  const { name, mobile, email, message } = req.body;
  if (!name || !message) return res.status(400).json({ message: 'Name and message are required' });
  await query('INSERT INTO contact_messages (name,mobile,email,message) VALUES (?,?,?,?)', [name, mobile || null, email || null, message]);
  res.status(201).json({ message: 'Message sent successfully' });
});

router.get('/api/search/admit-card', async (req, res) => {
  const q = req.query.applicationNumber || req.query.q || '';
  const records = await query('SELECT * FROM downloadable_records WHERE type="admit_card" AND application_number=? AND status="active"', [q]);
  const cms = await safeQuery('SELECT id, exam_name title, description body, download_link url, image_path FROM admit_cards WHERE status="published" AND (description LIKE ? OR exam_name LIKE ?)', [`%${q}%`, `%${q}%`]);
  res.json({ records, cms });
});

router.get('/api/search/results', async (req, res) => {
  const q = req.query.applicationNumber || req.query.q || '';
  const records = await query('SELECT * FROM downloadable_records WHERE type="result" AND application_number=? AND status="active"', [q]);
  const cms = await safeQuery('SELECT id, exam_name title, description body, result_link url, image_path FROM results WHERE status="published" AND (description LIKE ? OR exam_name LIKE ?)', [`%${q}%`, `%${q}%`]);
  res.json({ records, cms });
});

router.get('/api/payments/:id/receipt', requireRole('customer','admin'), async (req, res) => {
  const rows = await query('SELECT p.*, a.code, s.name service_name, u.name customer_name FROM payments p LEFT JOIN applications a ON a.id=p.application_id LEFT JOIN services s ON s.id=a.service_id JOIN users u ON u.id=p.customer_id WHERE p.id=?', [req.params.id]);
  const p = rows[0];
  if (!p) return res.status(404).send('Receipt not found');
  if (req.user.role !== 'admin' && p.customer_id !== req.user.id) return res.status(403).send('Access denied');
  res.type('html').send(`<html><head><title>Receipt ${p.id}</title><style>body{font-family:Arial;padding:32px}.box{border:1px solid #ddd;padding:24px;max-width:620px}h1{color:#1a3c6e}.row{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0}</style></head><body><div class="box"><h1>Ankita Cyber Cafe Receipt</h1><div class="row"><b>Receipt No</b><span>${p.id}</span></div><div class="row"><b>Customer</b><span>${p.customer_name}</span></div><div class="row"><b>Application</b><span>${p.code || '-'}</span></div><div class="row"><b>Service</b><span>${p.service_name || '-'}</span></div><div class="row"><b>Amount</b><span>₹${Number(p.amount).toLocaleString('en-IN')}</span></div><div class="row"><b>Status</b><span>${p.status}</span></div><div class="row"><b>Date</b><span>${new Date(p.created_at).toLocaleString()}</span></div></div></body></html>`);
});

router.get('/api/job/:id', async (req, res) => {
  const rows = await safeQuery('SELECT *, description body FROM jobs WHERE id=?', [req.params.id]);
  if (!rows.length) {
    const legacy = await safeQuery('SELECT * FROM cms_items WHERE id=? AND type="job"', [req.params.id]);
    if (!legacy.length) return res.status(404).json({ message: 'Job not found' });
    return res.json(legacy[0]);
  }
  res.json(rows[0]);
});

module.exports = router;
