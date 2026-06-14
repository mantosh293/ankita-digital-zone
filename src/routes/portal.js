const express = require('express');
const path = require('path');
const { query, transaction } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadDocs, uploadFinal } = require('../middleware/upload');
const { createOrder, verifyPayment } = require('../services/paymentService');
const { notify } = require('../services/notificationService');
const config = require('../config/env');
const { appCode } = require('../utils/helpers');

const router = express.Router();

router.get('/services', async (_req, res) => res.json({ services: await query('SELECT * FROM services WHERE status="active" ORDER BY category,name') }));

router.get('/track/:code', async (req, res) => {
  const code = req.params.code.replace(/^#/, '');
  const rows = await query('SELECT a.*, s.name service_name FROM applications a JOIN services s ON s.id=a.service_id WHERE a.code=? LIMIT 1', [code]);
  if (!rows[0]) return res.status(404).json({ message: 'Application not found' });
  res.json({ application: rows[0] });
});

router.post('/applications', requireRole('customer'), uploadDocs.single('document'), async (req, res) => {
  const service = (await query('SELECT * FROM services WHERE id=? AND status="active"', [req.body.serviceId]))[0];
  if (!service) return res.status(404).json({ message: 'Service not found' });
  const created = await transaction(async (conn) => {
    const [result] = await conn.execute('INSERT INTO applications (customer_id,service_id,notes,amount,payment_status) VALUES (?,?,?,?,?)', [req.user.id, service.id, req.body.notes || null, service.fee, 'pending']);
    const code = appCode(result.insertId);
    await conn.execute('UPDATE applications SET code=? WHERE id=?', [code, result.insertId]);
    if (req.file) await conn.execute('INSERT INTO documents (application_id,owner_id,type,original_name,stored_name,mime_type,size_bytes) VALUES (?,?,?,?,?,?,?)', [result.insertId, req.user.id, 'customer_upload', req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]);
    return { id: result.insertId, code };
  });
  const order = await createOrder(Number(service.fee), created.code);
  await query('INSERT INTO payments (application_id,customer_id,provider_order_id,amount,status,method) VALUES (?,?,?,?,?,?)', [created.id, req.user.id, order.id, service.fee, 'created', req.body.paymentMethod || 'upi']);
  await notify(req.user.id, 'Application submitted', `Your ${service.name} application ${created.code} has been submitted.`);
  res.status(201).json({ application: { ...created, service_name: service.name, amount: service.fee }, paymentOrder: order });
});

router.get('/customer/dashboard', requireRole('customer'), async (req, res) => {
  const applications = await query('SELECT a.*, s.name service_name FROM applications a JOIN services s ON s.id=a.service_id WHERE a.customer_id=? ORDER BY a.id DESC', [req.user.id]);
  const payments = await query('SELECT p.*, a.code application_code FROM payments p LEFT JOIN applications a ON a.id=p.application_id WHERE p.customer_id=? ORDER BY p.id DESC', [req.user.id]);
  const notifications = await query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20', [req.user.id]);
  res.json({ applications, payments, notifications, stats: { total: applications.length, completed: applications.filter(a => a.status === 'completed').length, pending: applications.filter(a => ['pending','assigned','in_progress'].includes(a.status)).length, paid: payments.filter(p => p.status === 'paid').length } });
});

router.get('/creator/dashboard', requireRole('creator'), async (req, res) => {
  const tasks = await query('SELECT t.*, a.code, a.status application_status, s.name service_name, u.name customer_name, s.creator_commission FROM tasks t JOIN applications a ON a.id=t.application_id JOIN services s ON s.id=a.service_id JOIN users u ON u.id=a.customer_id WHERE t.creator_id=? ORDER BY t.id DESC', [req.user.id]);
  const earnings = await query('SELECT * FROM earnings WHERE creator_id=? ORDER BY id DESC', [req.user.id]);
  const withdrawals = await query('SELECT * FROM withdrawals WHERE creator_id=? ORDER BY id DESC', [req.user.id]);
  const notifications = await query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20', [req.user.id]);
  res.json({ tasks, earnings, withdrawals, notifications, stats: { assigned: tasks.length, completed: tasks.filter(t => t.status === 'completed').length, available: earnings.filter(e => e.status === 'available').reduce((s,e)=>s+Number(e.amount),0), withdrawn: earnings.filter(e => e.status === 'withdrawn').reduce((s,e)=>s+Number(e.amount),0) } });
});

router.patch('/tasks/:id/status', requireRole('creator','admin'), async (req, res) => {
  const status = req.body.status;
  if (!['assigned','in_progress','completed','rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const task = (await query('SELECT t.*, a.customer_id, s.creator_commission FROM tasks t JOIN applications a ON a.id=t.application_id JOIN services s ON s.id=a.service_id WHERE t.id=?', [req.params.id]))[0];
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (req.user.role === 'creator' && task.creator_id !== req.user.id) return res.status(403).json({ message: 'Access denied' });
  await query('UPDATE tasks SET status=?, started_at=IF(?="in_progress" AND started_at IS NULL,NOW(),started_at), completed_at=IF(?="completed",NOW(),completed_at) WHERE id=?', [status, status, status, task.id]);
  await query('UPDATE applications SET status=? WHERE id=?', [status === 'completed' ? 'completed' : status, task.application_id]);
  if (status === 'completed') await query('INSERT INTO earnings (creator_id,task_id,amount,status) VALUES (?,?,?,?)', [task.creator_id, task.id, task.creator_commission, 'available']);
  await notify(task.customer_id, 'Application updated', `Your application status is now ${status}.`);
  res.json({ message: 'Task updated' });
});

router.post('/tasks/:id/final-work', requireRole('creator'), uploadFinal.single('document'), async (req, res) => {
  const task = (await query('SELECT * FROM tasks WHERE id=? AND creator_id=?', [req.params.id, req.user.id]))[0];
  if (!task || !req.file) return res.status(400).json({ message: 'Task and file are required' });
  await query('INSERT INTO documents (application_id,owner_id,type,original_name,stored_name,mime_type,size_bytes) VALUES (?,?,?,?,?,?,?)', [task.application_id, req.user.id, 'creator_final', req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]);
  res.json({ message: 'Final work uploaded' });
});

router.post('/payments/verify', requireRole('customer','admin'), async (req, res) => {
  if (!verifyPayment(req.body)) return res.status(400).json({ message: 'Payment verification failed' });
  await query('UPDATE payments SET status="paid", provider_payment_id=?, raw_payload=? WHERE provider_order_id=?', [req.body.razorpay_payment_id || req.body.paymentId || 'offline-paid', JSON.stringify(req.body), req.body.razorpay_order_id || req.body.orderId]);
  await query('UPDATE applications a JOIN payments p ON p.application_id=a.id SET a.payment_status="paid" WHERE p.provider_order_id=?', [req.body.razorpay_order_id || req.body.orderId]);
  res.json({ message: 'Payment verified' });
});

router.post('/withdrawals', requireRole('creator'), async (req, res) => {
  await query('INSERT INTO withdrawals (creator_id,amount,upi_id) VALUES (?,?,?)', [req.user.id, req.body.amount, req.body.upiId]);
  res.status(201).json({ message: 'Withdrawal request submitted' });
});

router.post('/support-tickets', requireAuth, async (req, res) => {
  await query('INSERT INTO support_tickets (user_id,subject,message) VALUES (?,?,?)', [req.user.id, req.body.subject, req.body.message]);
  res.status(201).json({ message: 'Support ticket created' });
});

router.get('/documents/:id/download', requireAuth, async (req, res) => {
  const doc = (await query('SELECT d.*, a.customer_id, a.creator_id FROM documents d JOIN applications a ON a.id=d.application_id WHERE d.id=?', [req.params.id]))[0];
  if (!doc) return res.status(404).json({ message: 'File not found' });
  const allowed = req.user.role === 'admin' || doc.customer_id === req.user.id || doc.creator_id === req.user.id || doc.owner_id === req.user.id;
  if (!allowed) return res.status(403).json({ message: 'Access denied' });
  const base = doc.type === 'creator_final' ? config.finalWorkDir : config.uploadDir;
  res.download(path.join(base, doc.stored_name), doc.original_name);
});

router.post('/contact', async (req, res) => {
  const { name, mobile, email, message } = req.body;
  if (!name || !message) return res.status(400).json({ message: 'Name and message are required' });
  await query('INSERT INTO contact_messages (name,mobile,email,message) VALUES (?,?,?,?)', [name, mobile || null, email || null, message]);
  res.status(201).json({ message: 'Message sent successfully' });
});
module.exports = router;

