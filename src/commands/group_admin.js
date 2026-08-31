const helpers = require('../utils/helpers');

const groupAdmin = {
    async tagall(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        try {
            const groupMeta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = groupMeta.participants.map(p => p.id);
            const text = args.join(' ') || 'Attention everyone!';

            let mentionText = `${text}\n\n`;
            mentions.forEach(jid => {
                mentionText += `@${jid.split('@')[0]} `;
            });

            await sock.sendMessage(msg.key.remoteJid, {
                text: mentionText,
                mentions,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${err.message}`,
            });
        }
    },

    async hidetag(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        try {
            const groupMeta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = groupMeta.participants.map(p => p.id);
            const text = args.join(' ') || 'Silent mention';

            await sock.sendMessage(msg.key.remoteJid, {
                text: text,
                mentions,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${err.message}`,
            });
        }
    },

    async kick(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (!targetJid) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to the person you want to kick.',
            });
        }

        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], 'remove');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👢 Removed @${targetJid.split('@')[0]}`,
                mentions: [targetJid],
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed to remove: ${err.message}`,
            });
        }
    },

    async promote(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!targetJid) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to the person you want to promote.',
            });
        }

        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], 'promote');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⬆️ Promoted @${targetJid.split('@')[0]} to admin`,
                mentions: [targetJid],
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed: ${err.message}`,
            });
        }
    },

    async demote(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!targetJid) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to the admin you want to demote.',
            });
        }

        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, [targetJid], 'demote');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⬇️ Demoted @${targetJid.split('@')[0]}`,
                mentions: [targetJid],
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed: ${err.message}`,
            });
        }
    },

    async antilink(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        const status = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(status)) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: *.antilink on* or *.antilink off*' });
        bot.setAntiLink?.(msg.key.remoteJid, status === 'on');
        await sock.sendMessage(msg.key.remoteJid, { text: `🔗 *Anti-Link ${status === 'on' ? 'enabled' : 'disabled'} for this group.*` });
    },

    async welcome(sock, msg, args, bot) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ This command only works in groups.',
            });
        }

        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            bot.setWelcome?.(msg.key.remoteJid, true);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '👋 *Welcome message enabled.*\n\nNew members will be greeted automatically in this group.',
            });
        } else if (status === 'off') {
            bot.setWelcome?.(msg.key.remoteJid, false);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '👋 *Welcome message disabled for this group.*',
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.welcome on* or *.welcome off*',
            });
        }
    },
};

module.exports = groupAdmin;
