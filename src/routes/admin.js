const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { publicUser } = require('../utils/helpers');
const { uploadDocs } = require('../middleware/upload');

const router = express.Router();
router.use(requireRole('admin'));

const uploadFields = uploadDocs.fields([
  { name: 'image', maxCount: 1 },
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
  { name: 'notificationPdf', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]);

const fileUrl = (file) => file ? `/storage/uploads/${file.filename}` : '';
const firstFile = (req, name) => req.files?.[name]?.[0] || null;
const statusValue = (value, fallback = 'published') => value || fallback;

function pickUploaded(req, field, fallback = '') {
  return fileUrl(firstFile(req, field)) || req.body[field] || fallback || '';
}

async function safeSelect(sql, params = []) {
  try { return await query(sql, params); } catch (_) { return []; }
}

router.get('/dashboard', async (_req, res) => {
  const [users, apps, payments, withdrawals, tickets, services, cms, contacts, records, heroBanners, jobs, admitCards, results, studentLinks] = await Promise.all([
    query('SELECT role,status,COUNT(*) total FROM users GROUP BY role,status'),
    query('SELECT a.*, s.name service_name, c.name customer_name, cr.name creator_name FROM applications a JOIN services s ON s.id=a.service_id JOIN users c ON c.id=a.customer_id LEFT JOIN users cr ON cr.id=a.creator_id ORDER BY a.id DESC LIMIT 100'),
    query('SELECT p.*, a.code application_code, u.name customer_name FROM payments p LEFT JOIN applications a ON a.id=p.application_id JOIN users u ON u.id=p.customer_id ORDER BY p.id DESC LIMIT 100'),
    query('SELECT w.*, u.name creator_name FROM withdrawals w JOIN users u ON u.id=w.creator_id ORDER BY w.id DESC LIMIT 100'),
    query('SELECT t.*, u.name user_name FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 100'),
    query('SELECT *, name service_name, fee price, COALESCE(description, required_documents) description, image_path FROM services ORDER BY id DESC'),
    query('SELECT * FROM cms_items WHERE type IN ("homepage","about","contact") ORDER BY type,id DESC'),
    query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100'),
    query('SELECT * FROM downloadable_records ORDER BY id DESC LIMIT 100'),
    safeSelect('SELECT * FROM hero_banners ORDER BY display_order,id DESC'),
    safeSelect('SELECT * FROM jobs ORDER BY id DESC'),
    safeSelect('SELECT * FROM admit_cards ORDER BY id DESC'),
    safeSelect('SELECT * FROM results ORDER BY id DESC'),
    safeSelect('SELECT * FROM student_links ORDER BY id DESC')
  ]);
  const revenue = payments.filter(p => p.status === 'paid').reduce((s,p)=>s+Number(p.amount),0);
  res.json({ users, applications: apps, payments, withdrawals, tickets, services, cms, contacts, records, heroBanners, jobs, admitCards, results, studentLinks, stats: { revenue, applications: apps.length, customers: users.filter(u=>u.role==='customer').reduce((s,u)=>s+u.total,0), creators: users.filter(u=>u.role==='creator').reduce((s,u)=>s+u.total,0), messages: contacts.length } });
});

router.get('/users/:role', async (req, res) => res.json({ users: (await query('SELECT * FROM users WHERE role=? AND status != "deleted" ORDER BY id DESC', [req.params.role])).map(publicUser) }));

router.post('/creators', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password || 'Creator@12345', 12);
  await query('INSERT INTO users (role,name,mobile,email,password_hash,status,email_verified_at) VALUES (?,?,?,?,?,?,NOW())', ['creator', req.body.name, req.body.mobile, req.body.email, hash, 'active']);
  res.status(201).json({ message: 'Creator added' });
});

router.patch('/users/:id/status', async (req, res) => { await query('UPDATE users SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ message: 'User status updated' }); });

router.post('/services', uploadFields, async (req, res) => {
  await query('INSERT INTO services (name,category,fee,creator_commission,required_documents,status,icon,description,image_path) VALUES (?,?,?,?,?,?,?,?,?)', [req.body.serviceName || req.body.name, req.body.category || 'general', req.body.price || req.body.fee || 0, req.body.creatorCommission || 0, req.body.requiredDocuments || req.body.description || '', req.body.status || 'active', req.body.icon || 'bi-grid', req.body.description || '', pickUploaded(req, 'image')]);
  res.status(201).json({ message: 'Service added' });
});

router.patch('/services/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM services WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Service not found' });
  await query('UPDATE services SET name=?,category=?,fee=?,creator_commission=?,required_documents=?,status=?,icon=?,description=?,image_path=? WHERE id=?', [req.body.serviceName || req.body.name || current.name, req.body.category || current.category, req.body.price || req.body.fee || current.fee, req.body.creatorCommission ?? current.creator_commission, req.body.requiredDocuments || current.required_documents || '', req.body.status || current.status || 'active', req.body.icon || current.icon || 'bi-grid', req.body.description || current.description || '', pickUploaded(req, 'image', current.image_path), req.params.id]);
  res.json({ message: 'Service updated' });
});

router.delete('/services/:id', async (req, res) => { await query('UPDATE services SET status="inactive" WHERE id=?', [req.params.id]); res.json({ message: 'Service disabled' }); });

router.post('/applications/:id/assign', async (req, res) => {
  const app = (await query('SELECT * FROM applications WHERE id=?', [req.params.id]))[0];
  if (!app) return res.status(404).json({ message: 'Application not found' });
  await transaction(async (conn) => {
    await conn.execute('UPDATE applications SET creator_id=?,status="assigned" WHERE id=?', [req.body.creatorId, app.id]);
    await conn.execute('INSERT INTO tasks (application_id,creator_id,status) VALUES (?,?,"assigned")', [app.id, req.body.creatorId]);
  });
  res.json({ message: 'Task assigned' });
});

router.patch('/applications/:id/status', async (req, res) => { await query('UPDATE applications SET status=? WHERE id=?', [req.body.status, req.params.id]); res.json({ message: 'Application updated' }); });
router.patch('/withdrawals/:id/status', async (req, res) => { await query('UPDATE withdrawals SET status=?,admin_note=? WHERE id=?', [req.body.status, req.body.note || null, req.params.id]); res.json({ message: 'Withdrawal updated' }); });

router.post('/cms-pages', uploadFields, async (req, res) => {
  const type = ['homepage','about','contact'].includes(req.body.type) ? req.body.type : 'homepage';
  await query('INSERT INTO cms_items (type,title,body,image_path,status) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body), image_path=VALUES(image_path), status=VALUES(status)', [type, req.body.title, req.body.body || req.body.description || '', pickUploaded(req, 'image'), statusValue(req.body.status)]);
  res.status(201).json({ message: 'CMS page saved' });
});

router.patch('/cms-pages/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM cms_items WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'CMS page not found' });
  await query('UPDATE cms_items SET type=?,title=?,body=?,image_path=?,status=? WHERE id=?', [req.body.type || current.type, req.body.title || current.title, req.body.body || req.body.description || current.body || '', pickUploaded(req, 'image', current.image_path), statusValue(req.body.status, current.status), req.params.id]);
  res.json({ message: 'CMS page updated' });
});

router.post('/hero-banners', uploadFields, async (req, res) => {
  await query('INSERT INTO hero_banners (title,subtitle,description,button_text,button_link,desktop_image,mobile_image,display_order,status) VALUES (?,?,?,?,?,?,?,?,?)', [req.body.title, req.body.subtitle || '', req.body.description || '', req.body.buttonText || '', req.body.buttonLink || '', pickUploaded(req, 'desktopImage'), pickUploaded(req, 'mobileImage'), req.body.displayOrder || 0, req.body.status || 'active']);
  res.status(201).json({ message: 'Hero banner added' });
});
router.patch('/hero-banners/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM hero_banners WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Hero banner not found' });
  await query('UPDATE hero_banners SET title=?,subtitle=?,description=?,button_text=?,button_link=?,desktop_image=?,mobile_image=?,display_order=?,status=? WHERE id=?', [req.body.title || current.title, req.body.subtitle || current.subtitle || '', req.body.description || current.description || '', req.body.buttonText || current.button_text || '', req.body.buttonLink || current.button_link || '', pickUploaded(req, 'desktopImage', current.desktop_image), pickUploaded(req, 'mobileImage', current.mobile_image), req.body.displayOrder ?? current.display_order, req.body.status || current.status || 'active', req.params.id]);
  res.json({ message: 'Hero banner updated' });
});
router.delete('/hero-banners/:id', async (req, res) => { await query('UPDATE hero_banners SET status="inactive" WHERE id=?', [req.params.id]); res.json({ message: 'Hero banner disabled' }); });

router.post('/jobs', uploadFields, async (req, res) => {
  await query('INSERT INTO jobs (title,vacancy,qualification,age_limit,last_date,notification_pdf,apply_link,description,image_path,status) VALUES (?,?,?,?,?,?,?,?,?,?)', [req.body.title, req.body.vacancy || '', req.body.qualification || '', req.body.ageLimit || '', req.body.lastDate || null, pickUploaded(req, 'notificationPdf'), req.body.applyLink || '', req.body.description || '', pickUploaded(req, 'image'), req.body.status || 'published']);
  res.status(201).json({ message: 'Job added' });
});
router.patch('/jobs/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM jobs WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Job not found' });
  await query('UPDATE jobs SET title=?,vacancy=?,qualification=?,age_limit=?,last_date=?,notification_pdf=?,apply_link=?,description=?,image_path=?,status=? WHERE id=?', [req.body.title || current.title, req.body.vacancy || current.vacancy || '', req.body.qualification || current.qualification || '', req.body.ageLimit || current.age_limit || '', req.body.lastDate || current.last_date || null, pickUploaded(req, 'notificationPdf', current.notification_pdf), req.body.applyLink || current.apply_link || '', req.body.description || current.description || '', pickUploaded(req, 'image', current.image_path), req.body.status || current.status || 'published', req.params.id]);
  res.json({ message: 'Job updated' });
});
router.delete('/jobs/:id', async (req, res) => { await query('UPDATE jobs SET status="archived" WHERE id=?', [req.params.id]); res.json({ message: 'Job deleted' }); });

router.post('/admit-cards', uploadFields, async (req, res) => {
  await query('INSERT INTO admit_cards (exam_name,exam_date,download_link,description,image_path,status) VALUES (?,?,?,?,?,?)', [req.body.examName, req.body.examDate || null, req.body.downloadLink || '', req.body.description || '', pickUploaded(req, 'image'), req.body.status || 'published']);
  res.status(201).json({ message: 'Admit card added' });
});
router.patch('/admit-cards/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM admit_cards WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Admit card not found' });
  await query('UPDATE admit_cards SET exam_name=?,exam_date=?,download_link=?,description=?,image_path=?,status=? WHERE id=?', [req.body.examName || current.exam_name, req.body.examDate || current.exam_date || null, req.body.downloadLink || current.download_link || '', req.body.description || current.description || '', pickUploaded(req, 'image', current.image_path), req.body.status || current.status || 'published', req.params.id]);
  res.json({ message: 'Admit card updated' });
});
router.delete('/admit-cards/:id', async (req, res) => { await query('UPDATE admit_cards SET status="archived" WHERE id=?', [req.params.id]); res.json({ message: 'Admit card deleted' }); });

router.post('/results', uploadFields, async (req, res) => {
  await query('INSERT INTO results (exam_name,result_date,result_link,description,image_path,status) VALUES (?,?,?,?,?,?)', [req.body.examName, req.body.resultDate || null, req.body.resultLink || '', req.body.description || '', pickUploaded(req, 'image'), req.body.status || 'published']);
  res.status(201).json({ message: 'Result added' });
});
router.patch('/results/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM results WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Result not found' });
  await query('UPDATE results SET exam_name=?,result_date=?,result_link=?,description=?,image_path=?,status=? WHERE id=?', [req.body.examName || current.exam_name, req.body.resultDate || current.result_date || null, req.body.resultLink || current.result_link || '', req.body.description || current.description || '', pickUploaded(req, 'image', current.image_path), req.body.status || current.status || 'published', req.params.id]);
  res.json({ message: 'Result updated' });
});
router.delete('/results/:id', async (req, res) => { await query('UPDATE results SET status="archived" WHERE id=?', [req.params.id]); res.json({ message: 'Result deleted' }); });

router.post('/student-links', uploadFields, async (req, res) => {
  await query('INSERT INTO student_links (title,url,logo,description,status) VALUES (?,?,?,?,?)', [req.body.title, req.body.url || '', pickUploaded(req, 'logo') || pickUploaded(req, 'image'), req.body.description || '', req.body.status || 'published']);
  res.status(201).json({ message: 'Student link added' });
});
router.patch('/student-links/:id', uploadFields, async (req, res) => {
  const current = (await query('SELECT * FROM student_links WHERE id=?', [req.params.id]))[0];
  if (!current) return res.status(404).json({ message: 'Student link not found' });
  await query('UPDATE student_links SET title=?,url=?,logo=?,description=?,status=? WHERE id=?', [req.body.title || current.title, req.body.url || current.url || '', pickUploaded(req, 'logo', current.logo) || pickUploaded(req, 'image', current.logo), req.body.description || current.description || '', req.body.status || current.status || 'published', req.params.id]);
  res.json({ message: 'Student link updated' });
});
router.delete('/student-links/:id', async (req, res) => { await query('UPDATE student_links SET status="archived" WHERE id=?', [req.params.id]); res.json({ message: 'Student link deleted' }); });

router.post('/cms', async (req, res) => {
  await query(`INSERT INTO cms_items (type,title,body,url,image_path,status,sort_order,vacancy,qualification,age_limit,last_date,notification_pdf,apply_link) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [req.body.type, req.body.title, req.body.body || '', req.body.url || '', req.body.imagePath || '', req.body.status || 'published', req.body.sortOrder || 0, req.body.vacancy || '', req.body.qualification || '', req.body.ageLimit || '', req.body.lastDate || '', req.body.notificationPdf || '', req.body.applyLink || '']);
  res.status(201).json({ message: 'CMS item saved' });
});

router.patch('/cms/:id', async (req, res) => {
  await query('UPDATE cms_items SET type=?,title=?,body=?,url=?,image_path=?,status=?,sort_order=?,vacancy=?,qualification=?,age_limit=?,last_date=?,notification_pdf=?,apply_link=? WHERE id=?', [req.body.type, req.body.title, req.body.body || '', req.body.url || '', req.body.imagePath || '', req.body.status || 'published', req.body.sortOrder || 0, req.body.vacancy || '', req.body.qualification || '', req.body.ageLimit || '', req.body.lastDate || '', req.body.notificationPdf || '', req.body.applyLink || '', req.params.id]);
  res.json({ message: 'CMS item updated' });
});

router.delete('/cms/:id', async (req, res) => { await query('UPDATE cms_items SET status="archived" WHERE id=?', [req.params.id]); res.json({ message: 'CMS item deleted' }); });

router.post('/records', async (req, res) => {
  await query('INSERT INTO downloadable_records (type,application_number,title,body,file_path,status) VALUES (?,?,?,?,?,?)', [req.body.type, req.body.applicationNumber, req.body.title, req.body.body || '', req.body.filePath || '', req.body.status || 'active']);
  res.status(201).json({ message: 'Record saved' });
});
router.patch('/records/:id', async (req, res) => {
  await query('UPDATE downloadable_records SET type=?,application_number=?,title=?,body=?,file_path=?,status=? WHERE id=?', [req.body.type, req.body.applicationNumber, req.body.title, req.body.body || '', req.body.filePath || '', req.body.status || 'active', req.params.id]);
  res.json({ message: 'Record updated' });
});
router.delete('/records/:id', async (req, res) => { await query('UPDATE downloadable_records SET status="inactive" WHERE id=?', [req.params.id]); res.json({ message: 'Record removed' }); });
router.patch('/contacts/:id/status', async (req, res) => { await query('UPDATE contact_messages SET status=? WHERE id=?', [req.body.status || 'read', req.params.id]); res.json({ message: 'Contact message updated' }); });

module.exports = router;
