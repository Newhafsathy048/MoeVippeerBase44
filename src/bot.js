const { 
    makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const helpers = require('./utils/helpers');
const messageHandler = require('./handlers/messageHandler');
const groupHandler = require('./handlers/groupHandler');

class MoEBot {
    constructor() {
        this.sock = null;
        this.qr = null;
        this.status = 'initializing';
        this.connectionInfo = {};
        this.startTime = Date.now();
        this.messageHistory = [];
        this.deletedMessages = {};
        this.wsClients = new Set();
        this.autoViewStatus = config.features.autoViewStatus;
        this.antiDelete = config.features.antiDelete;
        this.pendingPairingNumber = null;
        this.saveCreds = null;
        this.resetting = false;
        this.connectPromise = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.settingsPath = path.join(config.bot.sessionName, 'bot-settings.json');
        this.loadSettings();
    }

    loadSettings() {
        try {
            if (!fs.existsSync(this.settingsPath)) return;
            const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            if (typeof settings.autoViewStatus === 'boolean') this.autoViewStatus = settings.autoViewStatus;
            if (typeof settings.antiDelete === 'boolean') this.antiDelete = settings.antiDelete;
        } catch (err) {
            logger.warn(`Could not load bot settings: ${err.message}`);
        }
    }

    saveSettings() {
        try {
            fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
            fs.writeFileSync(this.settingsPath, JSON.stringify({
                autoViewStatus: this.autoViewStatus,
                antiDelete: this.antiDelete,
            }, null, 2));
        } catch (err) {
            logger.warn(`Could not save bot settings: ${err.message}`);
        }
    }

    broadcast(data) {
        const msg = JSON.stringify(data);
        this.wsClients.forEach(client => {
            if (client.readyState === 1) {
                try { client.send(msg); } catch {}
            }
        });
    }

    async connect() {
        if (this.connectPromise) return this.connectPromise;
        this.connectPromise = this._connect();
        try {
            return await this.connectPromise;
        } finally {
            this.connectPromise = null;
        }
    }

    scheduleReconnect() {
        if (this.resetting || this.reconnectTimer || this.connectPromise) return;
        const delay = Math.min(30000, 5000 * (2 ** Math.min(this.reconnectAttempts, 3)));
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((err) => logger.error('Reconnect failed:', err.message));
        }, delay);
    }

    async _connect() {
        const { state, saveCreds } = await useMultiFileAuthState(config.bot.sessionName);
        this.saveCreds = saveCreds;
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            logger: require('pino')({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS('Chrome'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        // Save credentials
        this.sock.ev.on('creds.update', saveCreds);

        // Connection updates
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qr = await QRCode.toDataURL(qr);
                this.status = 'waiting_qr';
                logger.info('QR code generated');
                this.broadcast({ type: 'status', status: 'waiting_qr', qr: this.qr });

                // Auto-request pairing code if phone number is pending
                if (this.pendingPairingNumber && !this.sock.authState.creds.registered) {
                    try {
                        await helpers.sleep(2000);
                        const code = await this.sock.requestPairingCode(this.pendingPairingNumber);
                        logger.info(`Auto-pairing code: ${code}`);
                        this.broadcast({ type: 'pairing_code', code, phone: this.pendingPairingNumber });
                        this.status = 'waiting_pairing';
                        this.broadcast({ type: 'status', status: 'waiting_pairing' });
                    } catch (err) {
                        logger.error('Auto pairing failed:', err.message);
                    }
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
                this.status = 'closed';
                this.broadcast({ type: 'status', status: 'closed' });

                if (shouldReconnect && !this.resetting) {
                    this.scheduleReconnect();
                }
            } else if (connection === 'open') {
                this.status = 'open';
                this.reconnectAttempts = 0;
                this.qr = null;
                this.pendingPairingNumber = null;
                logger.info('✅ WhatsApp connected!');
                this.broadcast({ 
                    type: 'status', 
                    status: 'open',
                    user: this.sock.user 
                });
            } else if (connection === 'connecting') {
                this.status = 'connecting';
                this.broadcast({ type: 'status', status: 'connecting' });
            }
        });

        // Messages
        this.sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return;

            for (const msg of m.messages) {
                if (msg.key?.remoteJid === 'status@broadcast' && this.autoViewStatus) {
                    try {
                        await this.sock.readMessages([msg.key]);
                        logger.info('Auto-viewed a WhatsApp status update');
                    } catch (err) {
                        logger.warn(`Auto-view status failed: ${err.message}`);
                    }
                }

                if (this.antiDelete && msg.key && msg.message) {
                    this.deletedMessages[msg.key.id] = {
                        message: msg.message,
                        sender: msg.key.participant || msg.key.remoteJid,
                        timestamp: msg.messageTimestamp,
                    };
                }

                const inboxEntry = {
                    id: msg.key.id,
                    sender: msg.pushName || msg.key.participant || msg.key.remoteJid,
                    senderJid: msg.key.participant || msg.key.remoteJid,
                    text: this.extractText(msg),
                    timestamp: msg.messageTimestamp * 1000,
                    fromMe: msg.key.fromMe,
                    isGroup: msg.key.remoteJid.endsWith('@g.us'),
                };
                this.messageHistory.unshift(inboxEntry);
                if (this.messageHistory.length > 50) this.messageHistory.pop();

                this.broadcast({ type: 'message', data: inboxEntry });
                await messageHandler(this.sock, msg, this);
            }
        });

        // Anti-delete
        this.sock.ev.on('messages.update', async (updates) => {
            if (!this.antiDelete) return;
            for (const update of updates) {
                const { key, update: updateData } = update;
                if (updateData?.message === null && this.deletedMessages[key.id]) {
                    const deleted = this.deletedMessages[key.id];
                    logger.info(`Anti-delete: ${key.id}`);
                    const ownerJid = config.owner.number + '@s.whatsapp.net';
                    await this.sock.sendMessage(ownerJid, {
                        text: `🗑️ *Anti-Delete Alert*\n\n*Sender:* ${deleted.sender}\n*Message:*\n${this.extractText({ message: deleted.message })}\n*Time:* ${new Date(deleted.timestamp * 1000).toLocaleString()}`,
                    });
                }
            }
        });

        // Group updates
        this.sock.ev.on('group-participants.update', async (update) => {
            await groupHandler(this.sock, update, this);
        });

        return this.sock;
    }

    hasRegisteredSession() {
        return Boolean(this.sock?.authState?.creds?.registered);
    }

    async waitForPairingSocket(timeoutMs = 15000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            if (this.hasRegisteredSession()) {
                throw new Error('Existing WhatsApp session found. Reset the session before pairing a new phone.');
            }
            if (this.sock && ['connecting', 'waiting_qr', 'waiting_pairing'].includes(this.status)) {
                return;
            }
            await helpers.sleep(250);
        }
        throw new Error('WhatsApp socket is not ready for pairing. Try resetting the old session and wait a few seconds.');
    }

    async requestPairingCode(phoneNumber) {
        if (!this.sock) throw new Error('Bot not initialized');
        if (this.hasRegisteredSession()) throw new Error('Existing WhatsApp session found. Reset the session before pairing a new phone.');

        const cleanNumber = phoneNumber.replace(/\D/g, '');
        this.pendingPairingNumber = cleanNumber;
        this.status = 'waiting_pairing';
        this.broadcast({ type: 'status', status: 'waiting_pairing' });

        try {
            const code = await this.sock.requestPairingCode(cleanNumber);
            logger.info(`Pairing code: ${code}`);
            this.broadcast({ type: 'pairing_code', code, phone: cleanNumber });
            return code;
        } catch (err) {
            logger.error('Pairing code error:', err.message);
            this.status = 'waiting_qr';
            this.broadcast({ type: 'status', status: 'waiting_qr', error: err.message });
            throw err;
        }
    }

    async resetSession() {
        this.resetting = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.status = 'resetting';
        this.broadcast({ type: 'status', status: 'resetting' });

        try {
            if (this.sock) {
                try { this.sock.end(undefined); } catch {}
                this.sock = null;
            }
            await helpers.sleep(500);
            fs.rmSync(config.bot.sessionName, { recursive: true, force: true });
            this.qr = null;
            this.pendingPairingNumber = null;
            this.startTime = Date.now();
            await this.connect();
        } finally {
            this.resetting = false;
        }
    }

    extractText(msg) {
        if (!msg.message) return '';
        const m = msg.message;
        return m.conversation || 
               m.extendedTextMessage?.text || 
               m.imageMessage?.caption || 
               m.videoMessage?.caption || 
               m.documentMessage?.caption || 
               '[Media]';
    }

    getInfo() {
        return {
            status: this.status,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            user: this.sock?.user || null,
            qr: this.qr,
            registered: this.hasRegisteredSession(),
            messageCount: this.messageHistory.length,
            memory: process.memoryUsage(),
        };
    }

    async restart() {
        logger.info('Restarting bot...');
        if (this.sock) this.sock.end(undefined);
        await helpers.sleep(2000);
        await this.connect();
    }
}

module.exports = new MoEBot();
