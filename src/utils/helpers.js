const axios = require('axios');
const fs = require('fs');
const path = require('path');

const helpers = {
    // Format uptime
    formatUptime(seconds) {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const parts = [];
        if (d) parts.push(`${d}d`);
        if (h) parts.push(`${h}h`);
        if (m) parts.push(`${m}m`);
        parts.push(`${s}s`);
        return parts.join(' ');
    },

    // Format bytes
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Download file from URL
    async downloadFile(url, destPath) {
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream',
            timeout: 30000,
        });
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    },

    // Random element from array
    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // Sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Check if user is owner
    isOwner(jid, config) {
        const num = jid.replace(/\D/g, '');
        return num === config.owner.number || num.endsWith(config.owner.number);
    },

    // Check if user is admin in group
    async isAdmin(sock, groupId, userId) {
        try {
            const groupMeta = await sock.groupMetadata(groupId);
            const participant = groupMeta.participants.find(p => p.id === userId);
            return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
        } catch {
            return false;
        }
    },

    // Check if bot is admin
    async isBotAdmin(sock, groupId, botId) {
        return await helpers.isAdmin(sock, groupId, botId);
    },

    // Temporary file path
    tmpPath(filename) {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        return path.join(tmpDir, filename);
    },

    // Clean temp files
    cleanTmp() {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) return;
        fs.readdirSync(tmpDir).forEach(f => {
            try { fs.unlinkSync(path.join(tmpDir, f)); } catch {}
        });
    },
};

module.exports = helpers;
