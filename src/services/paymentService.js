const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config/env');

const razorpay = config.razorpay.keyId && config.razorpay.keySecret
  ? new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret })
  : null;

async function createOrder(amount, receipt) {
  if (!razorpay) return { id: `offline_${Date.now()}`, amount: amount * 100, currency: 'INR', receipt, offline: true };
  return razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt });
}

function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id?.startsWith?.('order_')) return true;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(body).digest('hex');
  return expected === razorpay_signature;
}

module.exports = { createOrder, verifyPayment };
