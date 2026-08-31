const config = require('../config');
const helpers = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

async function resolveBrandImage() {
    if (config.branding.localLogoPath && fs.existsSync(config.branding.localLogoPath)) return fs.readFileSync(config.branding.localLogoPath);
    const configured = config.branding.logoUrl;
    const target = /^https?:\/\//i.test(configured) ? configured : process.env.PUBLIC_BASE_URL ? new URL(configured, process.env.PUBLIC_BASE_URL).toString() : null;
    if (!target) return null;
    try { const response = await fetch(target); if (!response.ok) return null; return Buffer.from(await response.arrayBuffer()); } catch { return null; }
}

const basic = {
    async menu(sock, msg, args, bot) {
        const menuText = `
╭━━━ *${config.bot.name} BOT* ━━━╮
┃
┃  *👤 Owner:* ${config.owner.name}
┃  *📞 Contact:* +${config.owner.number}
┃  *⏱️ Uptime:* ${helpers.formatUptime(process.uptime())}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

*📋 BASIC COMMANDS*
${config.commands.basic.map(c => `  • *.${c}*`).join('\n')}

*📥 DOWNLOADERS*
${config.commands.downloaders.map(c => `  • *.${c}*`).join('\n')}

*🤖 AI & TOOLS*
${config.commands.aiTools.map(c => `  • *.${c}*`).join('\n')}

*👥 GROUP ADMIN*
${config.commands.groupAdmin.map(c => `  • *.${c}*`).join('\n')}

*🎉 FUN*
${config.commands.fun.map(c => `  • *.${c}*`).join('\n')}

*🔒 OWNER ONLY*
${config.commands.owner.map(c => `  • *.${c}*`).join('\n')}

_Send *.menu* anytime to see this list._
        `.trim();

        const portrait = await resolveBrandImage();
        if (portrait) {
            await sock.sendMessage(msg.key.remoteJid, { image: portrait, mimetype: 'image/png', caption: menuText });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { text: menuText });
        }

        // Keep the menu image first, then send the track immediately after it.
        const audioPath = path.join(process.cwd(), 'public', 'assets', 'menu-audio.m4a');
        if (fs.existsSync(audioPath)) {
            await sock.sendMessage(msg.key.remoteJid, {
                audio: fs.readFileSync(audioPath),
                mimetype: 'audio/mp4',
                ptt: false,
                caption: `🎵 *${config.bot.name} Track*`,
            });
        }
    },

    async ping(sock, msg, args, bot) {
        const start = Date.now();
        const sent = await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pinging...' });
        const latency = Date.now() - start;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🏓 *Pong!*\n\nLatency: *${latency}ms*\nUptime: *${helpers.formatUptime(process.uptime())}*`,
            edit: sent.key,
        });
    },

    async alive(sock, msg, args, bot) {
        const info = bot.getInfo();
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ *${config.bot.name} is Online!*\n\n` +
                  `*Status:* ${info.status}\n` +
                  `*Uptime:* ${helpers.formatUptime(info.uptime)}\n` +
                  `*Memory:* ${helpers.formatBytes(info.memory?.heapUsed || 0)}\n` +
                  `*Messages handled:* ${info.messageCount}\n\n` +
                  `_Type *.menu* for commands._`,
        });
    },

    async owner(sock, msg, args, bot) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👤 *Owner Information*\n\n` +
                  `*Name:* ${config.owner.name}\n` +
                  `*Phone:* +${config.owner.number}\n` +
                  `*Email:* ${config.owner.email}\n\n` +
                  `Built with ❤️ using Baileys & Node.js`,
        });
    },

    async song(sock, msg, args, bot) {
        const audioPath = path.join(process.cwd(), 'public', 'assets', 'menu-audio.m4a');
        if (!fs.existsSync(audioPath)) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Menu audio not found on server.',
            });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            audio: fs.readFileSync(audioPath),
            mimetype: 'audio/mp4',
            ptt: false,
            caption: `🎵 *${config.bot.name} Track*`,
        });
    },

    async sticker(sock, msg, args, bot) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = msg.message?.imageMessage || quoted?.imageMessage;

        if (!imageMsg) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to an image with *.sticker* to convert it.',
            });
        }

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const sharp = require('sharp');

            await sock.sendMessage(msg.key.remoteJid, { text: '🎨 Creating sticker...' });

            const buffer = await downloadMediaMessage(
                quoted ? { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quoted } : msg,
                'buffer',
                {},
                { logger: require('pino')({ level: 'silent' }) }
            );

            const stickerBuffer = await sharp(buffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80 })
                .toBuffer();

            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed to create sticker: ${err.message}`,
            });
        }
    },

    async toimg(sock, msg, args, bot) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMsg = msg.message?.stickerMessage || quoted?.stickerMessage;

        if (!stickerMsg) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to a sticker with *.toimg* to convert it.',
            });
        }

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const sharp = require('sharp');

            await sock.sendMessage(msg.key.remoteJid, { text: '🖼️ Converting sticker...' });

            const buffer = await downloadMediaMessage(
                quoted ? { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quoted } : msg,
                'buffer',
                {},
                { logger: require('pino')({ level: 'silent' }) }
            );

            const imageBuffer = await sharp(buffer).png().toBuffer();

            await sock.sendMessage(msg.key.remoteJid, {
                image: imageBuffer,
                caption: '🖼️ Sticker converted to image',
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed to convert: ${err.message}`,
            });
        }
    },

    async vv(sock, msg, args, bot) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const viewOnce = quoted?.imageMessage?.viewOnce || quoted?.videoMessage?.viewOnce;

        if (!viewOnce) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Reply to a view-once message with *.vv* to reveal it.',
            });
        }

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');

            const buffer = await downloadMediaMessage(
                { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quoted },
                'buffer',
                {},
                { logger: require('pino')({ level: 'silent' }) }
            );

            if (quoted.imageMessage) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: buffer,
                    caption: '👁️ View-once image revealed',
                });
            } else if (quoted.videoMessage) {
                await sock.sendMessage(msg.key.remoteJid, {
                    video: buffer,
                    caption: '👁️ View-once video revealed',
                });
            }
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed to reveal: ${err.message}`,
            });
        }
    },

    async translate(sock, msg, args, bot) {
        const text = args.join(' ');
        if (!text) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.translate <text>* or reply to a message with *.translate*',
            });
        }

        try {
            const axios = require('axios');
            const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`, {
                timeout: 10000,
            });

            const translated = res.data.responseData.translatedText;
            const detected = res.data.responseData.match || 'auto';

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🌐 *Translation*\n\n` +
                      `*Original:* ${text}\n` +
                      `*Translated:* ${translated}\n` +
                      `*Detected:* ${detected}`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Translation failed: ${err.message}`,
            });
        }
    },

    async weather(sock, msg, args, bot) {
        const city = args.join(' ') || 'Dar es Salaam';

        try {
            const axios = require('axios');
            // Using wttr.in (free, no API key needed)
            const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
                timeout: 10000,
                headers: { 'User-Agent': 'curl/7.68.0' },
            });

            const current = res.data.current_condition[0];
            const location = res.data.nearest_area[0];

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🌤️ *Weather in ${location.areaName[0].value}, ${location.country[0].value}*\n\n` +
                      `*Temperature:* ${current.temp_C}°C / ${current.temp_F}°F\n` +
                      `*Condition:* ${current.weatherDesc[0].value}\n` +
                      `*Humidity:* ${current.humidity}%\n` +
                      `*Wind:* ${current.windspeedKmph} km/h\n` +
                      `*Feels like:* ${current.FeelsLikeC}°C`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Weather lookup failed. Try: *.weather Dar es Salaam*`,
            });
        }
    },
};

Object.defineProperty(basic, 'resolveBrandImage', { value: resolveBrandImage, enumerable: false });
module.exports = basic;
