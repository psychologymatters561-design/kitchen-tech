// SQLite through Node's built-in driver (node:sqlite). Zero native dependencies.
// Migrations are append-only: add a new entry, never edit an old one.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = [
  `CREATE TABLE orders (
     id TEXT PRIMARY KEY,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     status TEXT NOT NULL DEFAULT 'new',          -- new | awaiting_payment | paid | confirmed | shipped | delivered | cancelled | refunded
     payment_method TEXT NOT NULL,                 -- cod | online
     payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed
     product TEXT NOT NULL,
     qty INTEGER NOT NULL,
     unit_price INTEGER NOT NULL,                  -- rupees, set by the server, never by the browser
     discount INTEGER NOT NULL DEFAULT 0,
     total INTEGER NOT NULL,
     name TEXT NOT NULL,
     phone TEXT NOT NULL,
     email TEXT,
     address TEXT NOT NULL,
     city TEXT NOT NULL,
     state TEXT,
     pincode TEXT NOT NULL,
     notes TEXT,
     razorpay_order_id TEXT,
     razorpay_payment_id TEXT,
     utm TEXT,
     ip_hash TEXT
   )`,
  `CREATE INDEX idx_orders_created ON orders(created_at)`,
  `CREATE TABLE leads (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     type TEXT NOT NULL,                            -- dealer | oem | bulk | png | contact | demo
     status TEXT NOT NULL DEFAULT 'new',            -- new | contacted | qualified | won | lost
     name TEXT NOT NULL,
     phone TEXT NOT NULL,
     email TEXT,
     firm TEXT,
     city TEXT,
     gstin TEXT,
     volume TEXT,
     product TEXT,
     message TEXT,
     utm TEXT,
     ip_hash TEXT
   )`,
  `CREATE INDEX idx_leads_created ON leads(created_at)`,
  `CREATE TABLE events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     kind TEXT NOT NULL,
     ref TEXT,
     data TEXT
   )`,
];

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (n INTEGER PRIMARY KEY)');
  const done = new Set(db.prepare('SELECT n FROM _migrations').all().map((r) => r.n));
  MIGRATIONS.forEach((sql, n) => {
    if (done.has(n)) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (n) VALUES (?)').run(n);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
  return db;
}

export function logEvent(db, kind, ref, data) {
  db.prepare('INSERT INTO events (kind, ref, data) VALUES (?, ?, ?)').run(kind, ref ?? null, data ? JSON.stringify(data) : null);
}
