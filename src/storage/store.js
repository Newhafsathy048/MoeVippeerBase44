const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const KEY = crypto.createHash('sha256').update(process.env.STORAGE_ENCRYPTION_KEY || 'change-me-in-production').digest();

function emptyStore() {
  return { connections: [], settings: {}, groupSettings: {}, notificationPreferences: { connectionDrop: true, replyFailure: true, criticalError: true }, logs: [], messages: [], notifications: [] };
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(emptyStore(), null, 2));
}

function readStore() {
  ensureStore();
  try { return { ...emptyStore(), ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) }; }
  catch { return emptyStore(); }
}

function writeStore(store) {
  ensureStore();
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STORE_PATH);
}

function encrypt(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

function decrypt(value) {
  if (!value) return null;
  try {
    const [iv, tag, payload] = value.split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload, 'base64')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

function redactConnection(connection) {
  const { authSecret, ...safe } = connection;
  return safe;
}

function addLog(entry) {
  const store = readStore();
  store.logs.unshift({ id: crypto.randomUUID(), timestamp: Date.now(), ...entry });
  store.logs = store.logs.slice(0, 500);
  writeStore(store);
}

function addMessage(entry) {
  const store = readStore();
  store.messages.unshift({ id: crypto.randomUUID(), timestamp: Date.now(), ...entry });
  store.messages = store.messages.slice(0, 1000);
  writeStore(store);
}

function addNotification(entry) {
  const store = readStore();
  store.notifications.unshift({ id: crypto.randomUUID(), timestamp: Date.now(), read: false, ...entry });
  store.notifications = store.notifications.slice(0, 250);
  writeStore(store);
}

module.exports = {
  DATA_DIR,
  readStore,
  writeStore,
  encrypt,
  decrypt,
  redactConnection,
  addLog,
  addMessage,
  addNotification,
};
