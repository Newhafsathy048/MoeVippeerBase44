const config = require('../config');
const commands = require('../commands');
const logger = require('../utils/logger');

function isOwner(msg) {
    const sender = String(msg.key?.participant || msg.key?.remoteJid || '').split('@')[0].replace(/\D/g, '');
    return sender && sender === String(config.owner.number).replace(/\D/g, '');
}

async function isGroupAdmin(sock, msg) {
    const jid = msg.key?.remoteJid || '';
    if (!jid.endsWith('@g.us')) return false;
    const sender = msg.key?.participant || msg.participant || '';
    try {
        const metadata = await sock.groupMetadata(jid);
        return Boolean(metadata.participants?.find((participant) => participant.id === sender && ['admin', 'superadmin'].includes(participant.admin)));
    } catch { return false; }
}

async function messageHandler(sock, msg, bot) {
    try {
        // Extract text
        const text = extractText(msg);
        if (!text) return;

        // Check if it's a command
        const prefix = config.bot.prefix;
        if (!text.startsWith(prefix)) return;

        // Parse command
        const args = text.slice(prefix.length).trim().split(/\s+/);
        const cmdName = args.shift().toLowerCase();

        if (!cmdName) return;

        logger.info(`Command: .${cmdName} from ${msg.pushName || msg.key.remoteJid}`);

        // Execute command with owner protection for sensitive controls.
        if (config.commands.owner.includes(cmdName) && !isOwner(msg)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '🔒 This command is available to the bot owner only.' });
            return;
        }
        if (config.commands.groupAdmin.includes(cmdName) && !await isGroupAdmin(sock, msg)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '🛡️ This command is available to group admins only.' });
            return;
        }
        if (commands[cmdName]) {
            await commands[cmdName](sock, msg, args, bot);
        } else {
            // Unknown command
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Unknown command: *.${cmdName}*\n\nType *.menu* to see available commands.`,
            });
        }
    } catch (err) {
        logger.error('Message handler error:', err);
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ An error occurred while processing your command.`,
            });
        } catch {}
    }
}

function extractText(msg) {
    if (!msg.message) return '';
    const m = msg.message;
    return m.conversation || 
           m.extendedTextMessage?.text || 
           m.imageMessage?.caption || 
           m.videoMessage?.caption || 
           m.documentMessage?.caption || 
           '';
}

module.exports = messageHandler;
