// These commands are intentionally available to all users.

const owner = {
    async restart(sock, msg, args, bot) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: '🔄 *Restarting bot...*\n\nWill be back online shortly.',
        });

        setTimeout(() => {
            bot.restart();
        }, 2000);
    },

    // AutoViewStatus is intentionally available to all users.
    // The setting controls the bot globally and is persisted by the bot instance.
    async autoviewstatus(sock, msg, args, bot) {
        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            bot.autoViewStatus = true;
            bot.saveSettings?.({ autoViewStatus: true });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '👁️ *Auto-view status enabled.*\n\nThe bot will automatically view all status updates.',
            });
        } else if (status === 'off') {
            bot.autoViewStatus = false;
            bot.saveSettings?.({ autoViewStatus: false });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '👁️ *Auto-view status disabled.*',
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👁️ *Auto-view Status*\n\nCurrent: ${bot.autoViewStatus ? 'ON ✅' : 'OFF ❌'}\n\nUsage: *.autoviewstatus on* or *.autoviewstatus off*`,
            });
        }
    },

    async antidelete(sock, msg, args, bot) {
        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            bot.antiDelete = true;
            bot.saveSettings?.({ antiDelete: true });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '🗑️ *Anti-delete enabled.*\n\nDeleted messages will be recovered and sent to you.',
            });
        } else if (status === 'off') {
            bot.antiDelete = false;
            bot.saveSettings?.({ antiDelete: false });
            await sock.sendMessage(msg.key.remoteJid, {
                text: '🗑️ *Anti-delete disabled.*',
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🗑️ *Anti-Delete*\n\nCurrent: ${bot.antiDelete ? 'ON ✅' : 'OFF ❌'}\n\nUsage: *.antidelete on* or *.antidelete off*`,
            });
        }
    },

    async pair(sock, msg, args, bot) {
        const phone = args[0];
        if (!phone) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.pair <phone number>*\nExample: *.pair 12136061765*',
            });
        }

        try {
            const code = await bot.requestPairingCode(phone);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔗 *Pairing Code Generated*\n\n*Code:* ${code}\n*Phone:* +${phone.replace(/\D/g, '')}\n\nEnter this in WhatsApp → Settings → Linked Devices`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed to generate pairing code: ${err.message}`,
            });
        }
    },
};

module.exports = owner;
