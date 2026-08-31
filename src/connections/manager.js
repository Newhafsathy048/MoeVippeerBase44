const { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config');
const messageHandler = require('../handlers/messageHandler');
const groupHandler = require('../handlers/groupHandler');
const { readStore, writeStore, addLog, addMessage, addNotification, redactConnection, encrypt, decrypt, DATA_DIR } = require('../storage/store');
// DATA_DIR is /data on Railway — persistent volume. All session dirs live here.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function notifyIfEnabled(kind, entry) { const prefs = readStore().notificationPreferences || {}; const enabled = kind === 'connectionDrop' ? prefs.connectionDrop !== false : kind === 'replyFailure' ? prefs.replyFailure !== false : prefs.criticalError !== false; if (enabled) addNotification(entry); }

class ConnectionManager {
  constructor() {
    this.sockets = new Map();
    this.loadAuthState = (authDir) => useMultiFileAuthState(authDir);
    this.fetchVersion = fetchLatestBaileysVersion;
    this.createSocket = makeWASocket;
    this.timers = new Map();
    this.qr = new Map();
    this.deletedMessages = new Map();
    this.pairingCodes = new Map();
    this.pairingWaiters = new Map();
  }

  list() {
    const store = readStore();
    return store.connections.map((c) => ({ ...redactConnection(c), status: this.sockets.has(c.id) ? 'connected' : c.status || 'disconnected' }));
  }

  get(id) { return this.list().find((c) => c.id === id); }
  sessionPath(connection) { const sessionRef = connection.sessionRef ? decrypt(connection.sessionRef) : `sessions/${connection.id}`; return path.join(DATA_DIR, sessionRef); }

  async create({ name, phone }) {
    const store = readStore();
    const id = crypto.randomUUID();
    const connection = { id, name: name || `WhatsApp ${store.connections.length + 1}`, phone: String(phone || '').replace(/\D/g, ''), sessionRef: encrypt(`sessions/${id}`), status: 'connecting', createdAt: Date.now(), updatedAt: Date.now(), autoViewStatus: false, antiDelete: false, replyMode: 'command', replyText: 'Nimepokea ujumbe wako. Nitakujibu muda mfupi.', onboarding: { created: true, paired: false, configured: false, tested: false } };
    store.connections.push(connection);
    writeStore(store);
    addLog({ level: 'info', type: 'connection.created', connectionId: connection.id, message: `Connection ${connection.name} created` });
    await this.connect(connection.id);
    return this.get(connection.id);
  }

  async connect(id) {
    const store = readStore();
    const connection = store.connections.find((c) => c.id === id);
    if (!connection) throw new Error('Connection not found');
    if (this.sockets.has(id)) return this.sockets.get(id);
    const authDir = this.sessionPath(connection);
    addLog({ level: 'info', type: 'connection.reconnect_attempt', connectionId: id, message: `Opening session for ${connection.name}` });
    const { state, saveCreds } = await this.loadAuthState(authDir);
    const { version } = await this.fetchVersion();
    const sock = this.createSocket({ version, auth: state, browser: Browsers.macOS('Chrome'), printQRInTerminal: false, syncFullHistory: false, markOnlineOnConnect: true, logger: require('pino')({ level: 'silent' }) });
    this.sockets.set(id, sock);
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => this.handleUpdate(id, update));
    sock.ev.on('messages.upsert', (event) => this.handleMessages(id, event));
    sock.ev.on('group-participants.update', (update) => this.handleGroupUpdate(id, update));
    sock.ev.on('messages.update', (updates) => this.handleMessageUpdates(id, updates));
    return sock;
  }

  async handleUpdate(id, update) {
    const { connection, lastDisconnect, qr } = update;
    const store = readStore();
    const item = store.connections.find((c) => c.id === id);
    if (!item) return;
    if (qr) {
      this.qr.set(id, await QRCode.toDataURL(qr));
      item.status = 'pairing';
      item.onboarding = { ...(item.onboarding || {}), created: true };
      const waiter = this.pairingWaiters.get(id);
      if (waiter) {
        this.pairingWaiters.delete(id);
        clearTimeout(waiter.timer);
        waiter.resolve();
      }
    }
    if (connection === 'open') { item.status = 'connected'; item.onboarding = { ...(item.onboarding || {}), created: true, paired: true }; addLog({ level: 'info', type: 'connection.reconnect_success', connectionId: id, message: `${item.name} session opened` }); item.lastConnectedAt = Date.now(); item.phone = item.phone || this.sockets.get(id)?.user?.id?.split(':')[0]; this.qr.delete(id); this.timers.delete(id); addLog({ level: 'info', type: 'connection.open', connectionId: id, message: `${item.name} connected` }); }
    if (connection === 'close') {
      const waiter = this.pairingWaiters.get(id);
      if (waiter) {
        this.pairingWaiters.delete(id);
        clearTimeout(waiter.timer);
        waiter.reject(new Error(lastDisconnect?.error?.message || 'WhatsApp connection closed before pairing completed'));
      }
      this.sockets.delete(id); item.status = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut ? 'disconnected' : 'error'; item.lastError = lastDisconnect?.error?.message || 'Connection closed';
      addLog({ level: item.status === 'error' ? 'error' : 'warn', type: 'connection.closed', connectionId: id, message: `${item.name}: ${item.lastError}` });
      if (item.status === 'error') notifyIfEnabled('connectionDrop', { level: 'critical', type: 'connection.drop', connectionId: id, message: `${item.name} needs attention: ${item.lastError}` });
      if (item.status === 'error') this.scheduleReconnect(id);
    }
    item.updatedAt = Date.now(); writeStore(store);
  }

  async handleMessageUpdates(id, updates) {
    const store = readStore();
    const item = store.connections.find((c) => c.id === id);
    const sock = this.sockets.get(id);
    if (!item || !sock || !item.antiDelete) return;
    for (const entry of updates || []) {
      const key = `${id}:${entry.key?.id}`;
      const deleted = this.deletedMessages.get(key);
      if (entry.update?.message === null && deleted) {
        const ownerJid = `${String(config.owner.number).replace(/\D/g, '')}@s.whatsapp.net`;
        try { await sock.sendMessage(ownerJid, { text: `🗑️ *Anti-Delete Alert*\n\n*From:* ${deleted.sender}\n*Message:* ${deleted.text}` }); addLog({ level: 'warn', type: 'message.deleted_recovered', connectionId: id, message: `Recovered deleted message ${entry.key.id}` }); } catch (error) { addLog({ level: 'error', type: 'message.deleted_recovery_failed', connectionId: id, message: error.message }); }
        this.deletedMessages.delete(key);
      }
    }
  }

  async handleGroupUpdate(id, update) {
    const item = readStore().connections.find((c) => c.id === id);
    const sock = this.sockets.get(id);
    if (!item || !sock) return;
    const store = readStore();
    const bot = { welcomeEnabled: (groupId) => store.groupSettings?.[`${id}:${groupId}`]?.welcome === true };
    await groupHandler(sock, update, bot);
  }

  async handleMessages(id, event) {
    if (event.type !== 'notify') return;
    const sock = this.sockets.get(id); const store = readStore(); const item = store.connections.find((c) => c.id === id);
    if (!sock || !item) return;
    for (const msg of event.messages || []) {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (msg.key?.remoteJid === 'status@broadcast' && item.autoViewStatus) { try { await sock.readMessages([msg.key]); addLog({ level: 'info', type: 'status.auto_viewed', connectionId: id, message: 'Viewed a status update' }); } catch (error) { addLog({ level: 'error', type: 'status.auto_view_failed', connectionId: id, message: error.message }); } }
      if (item.antiDelete && msg.key?.id && msg.message) this.deletedMessages.set(`${id}:${msg.key.id}`, { sender: msg.key.participant || msg.key.remoteJid, text: text || '[media]' });
      addMessage({ direction: 'incoming', connectionId: id, remoteJid: msg.key?.remoteJid, text: text.slice(0, 1000) });
      addLog({ level: 'info', type: 'message.incoming', connectionId: id, message: text.slice(0, 160), remoteJid: msg.key?.remoteJid });
      if (msg.key?.remoteJid?.endsWith('@g.us') && store.groupSettings?.[`${id}:${msg.key.remoteJid}`]?.antiLink === true && /https?:\/\/|www\./i.test(text) && !msg.key.fromMe) {
        try { await sock.sendMessage(msg.key.remoteJid, { delete: msg.key }); addLog({ level: 'warn', type: 'group.antilink.deleted', connectionId: id, message: `Deleted link in ${msg.key.remoteJid}` }); } catch (error) { addLog({ level: 'error', type: 'group.antilink.failed', connectionId: id, message: error.message }); }
      }
      if (msg.key?.fromMe || !text) continue;
      try {
        const isCommand = text.trim().startsWith(config.bot.prefix);
        if (isCommand) {
          const bot = { getInfo: () => ({ status: item.status, uptime: item.lastConnectedAt ? Math.floor((Date.now() - item.lastConnectedAt) / 1000) : 0, messageCount: readStore().messages.filter((row) => row.connectionId === id).length, memory: process.memoryUsage() }), restart: () => this.restartConnection(id), requestPairingCode: (phone) => sock.requestPairingCode(phone), autoViewStatus: item.autoViewStatus === true, antiDelete: item.antiDelete === true, saveSettings: (patch = {}) => this.settings(id, patch), setWelcome: (groupId, enabled) => this.setWelcome(id, groupId, enabled), setAntiLink: (groupId, enabled) => this.setAntiLink(id, groupId, enabled) };
          await messageHandler(sock, msg, bot);
          addLog({ level: 'info', type: 'command.executed', connectionId: id, message: text.slice(0, 160) });
        } else if (item.replyMode === 'all') {
          const reply = item.replyText || 'Nimepokea ujumbe wako.';
          await sock.sendMessage(msg.key.remoteJid, { text: reply });
          addMessage({ direction: 'outgoing', connectionId: id, remoteJid: msg.key.remoteJid, text: reply });
          addLog({ level: 'info', type: 'message.outgoing', connectionId: id, message: 'Automated reply sent' });
        }
      } catch (error) { addLog({ level: 'error', type: 'message.reply_failed', connectionId: id, message: error.message }); notifyIfEnabled('replyFailure', { level: 'critical', type: 'reply.failed', connectionId: id, message: `${item.name} failed to reply: ${error.message}` }); }
    }
  }

  scheduleReconnect(id) {
    if (this.timers.has(id)) return;
    const delay = 5000;
    this.timers.set(id, setTimeout(() => { this.timers.delete(id); this.connect(id).catch((error) => addLog({ level: 'error', type: 'connection.reconnect_failed', connectionId: id, message: error.message })); }, delay));
  }

  async requestPairingCode(id, phone) {
    const store = readStore(); const item = store.connections.find((c) => c.id === id); if (!item) throw new Error('Connection not found');
    const digits = String(phone || item.phone || '').replace(/\D/g, ''); if (digits.length < 8 || digits.length > 15) throw new Error('Enter a valid WhatsApp number with country code, digits only');
    let sock = this.sockets.get(id); if (!sock) sock = await this.connect(id); if (!sock || typeof sock.requestPairingCode !== 'function') throw new Error('Pairing code is unavailable until the WhatsApp socket is ready');
    // Baileys emits `qr` when the socket handshake is ready. Waiting for that
    // event is required before requestPairingCode; a fixed sleep is unreliable.
    if (sock.ev?.on && !this.qr.has(id)) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pairingWaiters.delete(id);
          reject(new Error('WhatsApp socket did not become ready for pairing. Generate a new code.'));
        }, 20000);
        this.pairingWaiters.set(id, { resolve, reject, timer });
      });
    }
    let code;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt === 0 && sock.ev?.on) await sleep(500);
      try {
        code = await sock.requestPairingCode(digits);
        break;
      } catch (error) {
        lastError = error;
        const message = String(error?.message || error);
        const retryable = /connection failure|not connected|timed out|timeout|428|503|515/i.test(message);
        if (!retryable || attempt === 2) throw error;
        await sleep(1000 * (attempt + 1));
      }
    }
    if (!code) throw lastError || new Error('WhatsApp did not return a pairing code');
    const expiresAt = Date.now() + 600000; this.pairingCodes.set(id, { requestedAt: Date.now(), expiresAt }); item.phone = digits; item.status = 'pairing'; item.onboarding = { ...(item.onboarding || {}), created: true }; item.updatedAt = Date.now(); writeStore(store); addLog({ level: 'info', type: 'connection.pairing_code_requested', connectionId: id, message: 'Official WhatsApp pairing code requested' }); return { connectionId: id, code, expiresAt };
  }
  pairingCodeStatus(id) { const value = this.pairingCodes.get(id); return value && value.expiresAt > Date.now() ? { requestedAt: value.requestedAt, expiresAt: value.expiresAt } : null; }

  markTested(id) { const store = readStore(); const item = store.connections.find((c) => c.id === id); if (!item) throw new Error('Connection not found'); item.onboarding = { ...(item.onboarding || {}), created: true, tested: true }; item.updatedAt = Date.now(); writeStore(store); addLog({ level: 'info', type: 'onboarding.tested', connectionId: id, message: 'Owner confirmed a test message' }); return this.get(id); }
  async restartConnection(id) { await this.disconnect(id); return this.connect(id); }
  async disconnect(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const waiter = this.pairingWaiters.get(id);
    if (waiter) {
      this.pairingWaiters.delete(id);
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Pairing cancelled by user'));
    }
    const sock = this.sockets.get(id);
    if (sock) { try { sock.end(undefined); } catch {} this.sockets.delete(id); }
    const store = readStore(); const item = store.connections.find((c) => c.id === id); if (item) { item.status = 'disconnected'; item.updatedAt = Date.now(); writeStore(store); addLog({ level: 'info', type: 'connection.disconnected', connectionId: id, message: `${item.name} disconnected by user` }); } }
  qrCode(id) { return this.qr.get(id) || null; }
  logs(limit = 100) { return readStore().logs.slice(0, Math.min(Number(limit) || 100, 500)); }
  setWelcome(connectionId, groupId, enabled) { const store = readStore(); store.groupSettings = store.groupSettings || {}; const key = `${connectionId}:${groupId}`; store.groupSettings[key] = { ...(store.groupSettings[key] || {}), welcome: enabled === true, updatedAt: Date.now() }; writeStore(store); addLog({ level: 'info', type: 'group.welcome.updated', connectionId, message: `${groupId} welcome ${enabled ? 'enabled' : 'disabled'}` }); }
  setAntiLink(connectionId, groupId, enabled) { const store = readStore(); store.groupSettings = store.groupSettings || {}; const key = `${connectionId}:${groupId}`; store.groupSettings[key] = { ...(store.groupSettings[key] || {}), antiLink: enabled === true, updatedAt: Date.now() }; writeStore(store); addLog({ level: 'info', type: 'group.antilink.updated', connectionId, message: `${groupId} anti-link ${enabled ? 'enabled' : 'disabled'}` }); }
  settings(id, patch) { const store = readStore(); const item = store.connections.find((c) => c.id === id); if (!item) throw new Error('Connection not found'); if (patch.name) item.name = String(patch.name).slice(0, 80); if (patch.replyMode && ['all', 'command', 'off'].includes(patch.replyMode)) item.replyMode = patch.replyMode; if (typeof patch.replyText === 'string') item.replyText = patch.replyText.slice(0, 1000); if (typeof patch.autoViewStatus === 'boolean') item.autoViewStatus = patch.autoViewStatus; if (typeof patch.antiDelete === 'boolean') item.antiDelete = patch.antiDelete; item.onboarding = { ...(item.onboarding || {}), created: true, configured: true }; item.updatedAt = Date.now(); writeStore(store); addLog({ level: 'info', type: 'settings.updated', connectionId: id, message: 'Bot settings updated' }); return this.get(id); }
}

module.exports = new ConnectionManager();
