import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.ADMIN_TOKEN = 'test-admin-token-1234567890';
process.env.AANCH_PRICE = '2499';
process.env.AANCH_MRP = '3999';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';

const { createApp } = await import('../server/index.js');

let server, base, db;
before(async () => {
  const made = createApp({ dbPath: ':memory:' });
  db = made.db;
  server = made.app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const order = { qty: 2, paymentMethod: 'cod', name: 'Test Buyer', phone: '+91 98765 43210', address: 'House 12, Test Street', city: 'Delhi', pincode: '110039' };

test('config exposes price from env, never secrets', async () => {
  const c = await (await fetch(base + '/api/config')).json();
  assert.equal(c.product.price, 2499);
  assert.equal(c.product.orderable, true);
  assert.equal(JSON.stringify(c).includes('whsec_test'), false);
  assert.equal(JSON.stringify(c).includes('test-admin-token'), false);
});

test('catalogue filters', async () => {
  const all = await (await fetch(base + '/api/catalogue')).json();
  assert.ok(all.count > 100);
  const g3 = await (await fetch(base + '/api/catalogue?burners=3&top=glass')).json();
  assert.equal(g3.count, 16);
});

test('COD order: server sets the price, ignores the browser', async () => {
  const res = await post('/api/orders', { ...order, unitPrice: 1, total: 1 });
  assert.equal(res.status, 201);
  const o = await res.json();
  assert.match(o.id, /^KT-\d{4}-[A-Z2-9]{5}$/);
  assert.equal(o.total, 4998);
  assert.match(o.whatsapp, /^https:\/\/wa\.me\/918882266677\?text=/);
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
  assert.equal(row.phone, '9876543210');
  assert.equal(row.unit_price, 2499);
});

test('order validation returns field errors', async () => {
  const res = await post('/api/orders', { ...order, phone: '12345', pincode: '01234', qty: 50 });
  assert.equal(res.status, 422);
  const e = await res.json();
  assert.ok(e.fields.phone && e.fields.pincode && e.fields.qty);
});

test('online payment refused cleanly when Razorpay keys are missing', async () => {
  const res = await post('/api/orders', { ...order, paymentMethod: 'online' });
  assert.equal(res.status, 422);
});

test('honeypot: bots get a fake success and nothing is stored', async () => {
  const before = db.prepare('SELECT COUNT(*) n FROM orders').get().n;
  const res = await post('/api/orders', { ...order, website: 'spam.example' });
  assert.equal(res.status, 201);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n, before);
});

test('order tracking needs id AND phone', async () => {
  const o = await (await post('/api/orders', order)).json();
  assert.equal((await fetch(`${base}/api/orders/track?id=${o.id}&phone=9876543210`)).status, 200);
  assert.equal((await fetch(`${base}/api/orders/track?id=${o.id}&phone=9999999999`)).status, 404);
});

test('dealer lead needs a city; valid lead returns WhatsApp handoff', async () => {
  const bad = await post('/api/leads', { type: 'dealer', name: 'Ravi', phone: '9876543210' });
  assert.equal(bad.status, 422);
  const ok = await post('/api/leads', { type: 'dealer', name: 'Ravi', phone: '9876543210', city: 'Lucknow', firm: 'Ravi Traders', gstin: '07AAAAA0000A1Z5' });
  assert.equal(ok.status, 201);
  const l = await ok.json();
  assert.ok(l.id > 0);
  assert.match(decodeURIComponent(l.whatsapp), /Ravi Traders, Lucknow/);
});

test('admin: token required, then lists and updates', async () => {
  assert.equal((await fetch(base + '/api/admin/orders')).status, 401);
  const H = { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN };
  const list = await (await fetch(base + '/api/admin/orders', { headers: H })).json();
  assert.ok(list.length >= 1);
  const res = await fetch(base + '/api/admin/orders/' + list[0].id, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) });
  assert.equal((await res.json()).status, 'confirmed');
  const stats = await (await fetch(base + '/api/admin/stats', { headers: H })).json();
  assert.ok(stats.orders.orders >= 1);
});

test('razorpay webhook: bad signature rejected, good one marks paid once', async () => {
  db.prepare(`INSERT INTO orders (id, status, payment_method, product, qty, unit_price, total, name, phone, address, city, pincode, razorpay_order_id)
              VALUES ('KT-TEST-AAAAA','awaiting_payment','online','aanch',1,2499,2499,'X','9876543210','addr addr','Delhi','110039','order_rp_1')`).run();
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_rp_1' } } } });
  const bad = await fetch(base + '/api/payments/razorpay/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': 'nope' }, body });
  assert.equal(bad.status, 400);
  const sig = createHmac('sha256', 'whsec_test').update(body).digest('hex');
  const good = await fetch(base + '/api/payments/razorpay/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': sig }, body });
  assert.equal((await good.json()).updated, true);
  const again = await fetch(base + '/api/payments/razorpay/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': sig }, body });
  assert.equal((await again.json()).updated, false);
  assert.equal(db.prepare("SELECT payment_status FROM orders WHERE id='KT-TEST-AAAAA'").get().payment_status, 'paid');
});

test('security headers and SEO routes', async () => {
  const r = await fetch(base + '/robots.txt');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await r.text(), /Sitemap:/);
  assert.match(await (await fetch(base + '/sitemap.xml')).text(), /\/aanch/);
  const redirect = await fetch(base + '/infrared-cooktop', { redirect: 'manual' });
  assert.equal(redirect.status, 301);
});
