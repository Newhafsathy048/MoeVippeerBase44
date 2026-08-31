const logger = require('../utils/logger');

async function groupHandler(sock, update, bot) {
    try {
        const { id, participants, action } = update;

        // Welcome new members only when enabled for this connection and group.
        if (action === 'add' && bot.welcomeEnabled?.(id)) {
            for (const participant of participants) {
                const welcomeText = `👋 *Welcome!*\n\n@${participant.split('@')[0]} has joined the group!`;
                await sock.sendMessage(id, {
                    text: welcomeText,
                    mentions: [participant],
                });
            }
        }

        // Goodbye leaving members
        if (action === 'remove') {
            for (const participant of participants) {
                await sock.sendMessage(id, {
                    text: `👋 @${participant.split('@')[0]} left the group.`,
                    mentions: [participant],
                });
            }
        }
    } catch (err) {
        logger.error('Group handler error:', err);
    }
}

module.exports = groupHandler;
