const config = require('../config');
const axios = require('axios');

const aiTools = {
    async ai(sock, msg, args, bot) {
        const prompt = args.join(' ');
        if (!prompt) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.ai <your question>*',
            });
        }

        if (!config.ai.apiKey) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: `🤖 *AI is not configured.*\n\nSet OPENAI_API_KEY in your .env file to enable AI responses.`,
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Thinking...' });

            const res = await axios.post(`${config.ai.baseUrl}/chat/completions`, {
                model: config.ai.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
            }, {
                headers: {
                    'Authorization': `Bearer ${config.ai.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            const reply = res.data.choices[0].message.content;
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🤖 *AI Response*\n\n${reply}`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ AI Error: ${err.response?.data?.error?.message || err.message}`,
            });
        }
    },

    async manus(sock, msg, args, bot) {
        const task = args.join(' ');
        if (!task) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.manus <task description>*',
            });
        }

        if (!config.ai.apiKey) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: `🤖 *Manus AI is not configured.*\n\nSet OPENAI_API_KEY in your .env file.`,
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Processing your task...' });

            const res = await axios.post(`${config.ai.baseUrl}/chat/completions`, {
                model: config.ai.model,
                messages: [
                    { role: 'system', content: 'You are Manus, an AI assistant that breaks down tasks into steps and provides detailed solutions.' },
                    { role: 'user', content: `Task: ${task}\n\nPlease break this down into clear steps and provide a solution.` },
                ],
                max_tokens: 1500,
            }, {
                headers: {
                    'Authorization': `Bearer ${config.ai.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            const reply = res.data.choices[0].message.content;
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🤖 *Manus Task Result*\n\n*Task:* ${task}\n\n${reply}`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${err.response?.data?.error?.message || err.message}`,
            });
        }
    },
};

module.exports = aiTools;
