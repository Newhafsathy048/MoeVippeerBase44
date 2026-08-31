require('dotenv').config();

const path = require('path');

// DATA_DIR is /data on Railway (persistent volume), or ./data locally.
// Sessions and store.json must live here — not in /app which is wiped on redeploy.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

module.exports = {
    owner: {
        number: process.env.OWNER_NUMBER || '12136061765',
        name: process.env.OWNER_NAME || 'Moe Hafsathy',
        email: process.env.OWNER_EMAIL || 'nahsathy@gmail.com',
    },
    bot: {
        name: process.env.BOT_NAME || 'MoE',
        prefix: process.env.PREFIX || '.',
        // Sessions stored inside DATA_DIR so they survive Railway restarts/redeploys.
        sessionName: path.join(DATA_DIR, 'auth_info'),
    },
    branding: {
        logoUrl: process.env.MOE_LOGO_URL || '/manus-storage/moe-brand_91e78bc3.png',
        localLogoPath: process.env.MOE_LOGO_PATH || path.join(process.cwd(), 'public', 'assets', 'moe-logo.png'),
    },
    dashboard: {
        port: parseInt(process.env.PORT) || 3000,
        password: process.env.DASHBOARD_PASSWORD || 'moe-admin-2026',
    },
    features: {
        autoReadStatus: process.env.AUTO_READ_STATUS === 'true',
        antiDelete: process.env.ANTI_DELETE === 'true',
        autoViewStatus: process.env.AUTO_VIEW_STATUS === 'true',
    },
    ai: {
        apiKey: process.env.OPENAI_API_KEY || null,
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
    },
    // Command categories for menu display only.
    // owner[] = commands blocked to non-owners by messageHandler.
    commands: {
        basic: ['menu', 'ping', 'alive', 'owner', 'song', 'sticker', 'toimg', 'vv', 'translate', 'weather'],
        downloaders: ['tiktok', 'ig', 'fb', 'play', 'ymp4', 'pin', 'ytsearch'],
        aiTools: ['ai', 'manus'],
        groupAdmin: ['tagall', 'hidetag', 'kick', 'promote', 'demote', 'antilink', 'welcome'],
        fun: ['8ball', 'quote'],
        owner: ['restart', 'antidelete', 'autoviewstatus', 'pair'],
    }
};
