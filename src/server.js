const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');
const { addLog, addMessage, addNotification, readStore } = require('./storage/store');
const config = require('./config');
const logger = require('./utils/logger');
const manager = require('./connections/manager');

class DashboardServer {
  constructor() { this.app = express(); this.server = http.createServer(this.app); this.wss = new WebSocketServer({ server: this.server, path: '/ws' }); this.setup(); }
  setup() {
    this.app.get('/webhooks/whatsapp', (req, res) => { const expected = process.env.META_VERIFY_TOKEN; if (expected && req.query['hub.verify_token'] === expected) return res.type('text').send(req.query['hub.challenge']); res.sendStatus(403); });
    this.app.post('/webhooks/whatsapp', express.raw({ type: 'application/json', limit: '3mb' }), (req, res) => { const signature = req.get('x-hub-signature-256') || ''; const secret = process.env.META_APP_SECRET; const digest = secret ? `sha256=${crypto.createHmac('sha256', secret).update(req.body).digest('hex')}` : ''; if (secret && (signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest)))) return res.sendStatus(403); let payload; try { payload = JSON.parse(req.body.toString('utf8')); } catch { return res.sendStatus(400); } res.sendStatus(200); setImmediate(() => { for (const entry of payload.entry || []) for (const change of entry.changes || []) for (const msg of change.value?.messages || []) { const id = msg.id; const existing = readStore().messages.some((row) => row.externalId === id); if (id && existing) continue; const text = msg.text?.body || `[${msg.type || 'event'}]`; addMessage({ direction: 'incoming', externalId: id, connectionId: change.value?.metadata?.phone_number_id, remoteJid: msg.from, text }); addLog({ level: 'info', type: 'cloud_api.message', connectionId: change.value?.metadata?.phone_number_id, message: text.slice(0, 160) }); } }); });
    this.app.use(express.json({ limit: '100kb' }));
    this.app.use(express.static(path.join(process.cwd(), 'public')));
    this.app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });
    this.app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'moe-bot', timestamp: Date.now() }));
    this.app.get('/api/status', (req, res) => { const store = readStore(); res.json({ connections: manager.list(), logs: manager.logs(8), messages: store.messages.slice(0, 30), notifications: store.notifications.slice(0, 30) }); });
    this.app.get('/api/connections', (req, res) => res.json(manager.list()));
    this.app.post('/api/connections', async (req, res) => { try { const item = await manager.create(req.body || {}); res.status(201).json(item); } catch (error) { logger.error('Create connection failed:', error.message); res.status(400).json({ error: error.message }); } });
    this.app.post('/api/connections/:id/connect', async (req, res) => { try { await manager.connect(req.params.id); res.json(manager.get(req.params.id)); } catch (error) { res.status(400).json({ error: error.message }); } });
    this.app.post('/api/connections/:id/onboarding/tested', (req, res) => { try { res.json(manager.markTested(req.params.id)); } catch (error) { res.status(400).json({ error: error.message }); } });
    this.app.post('/api/connections/:id/pairing-code', async (req, res) => { try { const result = await manager.requestPairingCode(req.params.id, req.body?.phone); res.json(result); } catch (error) { res.status(400).json({ error: error.message }); } });
    this.app.get('/api/connections/:id/pairing-code', (req, res) => { const status = manager.pairingCodeStatus(req.params.id); status ? res.json(status) : res.status(404).json({ error: 'No active pairing code request' }); });
    this.app.post('/api/connections/:id/disconnect', async (req, res) => { try { await manager.disconnect(req.params.id); res.json(manager.get(req.params.id)); } catch (error) { res.status(400).json({ error: error.message }); } });
    this.app.patch('/api/connections/:id/settings', (req, res) => { try { res.json(manager.settings(req.params.id, req.body || {})); } catch (error) { res.status(400).json({ error: error.message }); } });
    this.app.get('/api/connections/:id/qr', (req, res) => { const qr = manager.qrCode(req.params.id); qr ? res.json({ qr }) : res.status(404).json({ error: 'QR code is not available yet' }); });
    this.app.get('/api/connections/:id/history', (req, res) => { if (!manager.get(req.params.id)) return res.status(404).json({ error: 'Connection not found' }); const store = readStore(); res.json({ connectionId: req.params.id, logs: store.logs.filter((row) => row.connectionId === req.params.id), messages: store.messages.filter((row) => row.connectionId === req.params.id) }); });
    this.app.get('/api/logs', (req, res) => res.json(manager.logs(req.query.limit)));
    this.app.get('/api/messages', (req, res) => res.json(require('./storage/store').readStore().messages.slice(0, 250)));
    this.app.get('/api/notifications', (req, res) => res.json(readStore().notifications.slice(0, 100)));
    this.app.get('/api/notification-preferences', (req, res) => res.json(readStore().notificationPreferences || { connectionDrop: true, replyFailure: true, criticalError: true }));
    this.app.patch('/api/notification-preferences', (req, res) => { const body = req.body || {}; const keys = ['connectionDrop', 'replyFailure', 'criticalError']; if (Object.keys(body).some((key) => !keys.includes(key)) || keys.some((key) => body[key] !== undefined && typeof body[key] !== 'boolean')) return res.status(400).json({ error: 'Preference values must be booleans' }); const store = readStore(); store.notificationPreferences = { connectionDrop: body.connectionDrop ?? true, replyFailure: body.replyFailure ?? true, criticalError: body.criticalError ?? true }; require('./storage/store').writeStore(store); res.json(store.notificationPreferences); });
    this.app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'index.html')));
    this.wss.on('connection', (ws) => { const send = () => { const store = readStore(); ws.send(JSON.stringify({ type: 'snapshot', connections: manager.list(), logs: manager.logs(20), messages: store.messages.slice(0, 30), notifications: store.notifications.slice(0, 30) })); }; send(); const timer = setInterval(send, 5000); ws.on('close', () => clearInterval(timer)); });
  }
  start() { this.server.listen(config.dashboard.port, '0.0.0.0', () => logger.info(`Dashboard listening on port ${config.dashboard.port}`)); }
}
module.exports = DashboardServer;
