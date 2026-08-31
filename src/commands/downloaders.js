const axios = require('axios');
const fs = require('fs');
const helpers = require('../utils/helpers');
const config = require('../config');

const downloaders = {
    async tiktok(sock, msg, args, bot) {
        const url = args[0];
        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.tiktok <TikTok URL>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Downloading TikTok video...' });

            // Using a free TikTok downloader API
            const res = await axios.get(`https://api.tikdown.io/get?url=${encodeURIComponent(url)}`, {
                timeout: 30000,
            }).catch(() => null);

            if (res?.data?.video) {
                const videoBuffer = await axios.get(res.data.video, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                });

                await sock.sendMessage(msg.key.remoteJid, {
                    video: Buffer.from(videoBuffer.data),
                    caption: `📱 *TikTok Download*\n\nBy ${config.bot.name}`,
                });
            } else {
                // Fallback: send link
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ Direct download failed.\n\nTikTok URL: ${url}\n\n_Try using an external downloader._`,
                });
            }
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Download failed: ${err.message}`,
            });
        }
    },

    async ig(sock, msg, args, bot) {
        const url = args[0];
        if (!url || !url.includes('instagram.com')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.ig <Instagram URL>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Fetching Instagram media...' });

            // Using savefrom.net API pattern
            const res = await axios.get(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`, {
                timeout: 15000,
            }).catch(() => null);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `📸 *Instagram Media*\n\n` +
                      `*URL:* ${url}\n` +
                      `${res?.data?.title ? `*Caption:* ${res.data.title}\n` : ''}` +
                      `\n_For best results, use an external downloader like savefrom.net_`,
            });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Failed: ${err.message}`,
            });
        }
    },

    async fb(sock, msg, args, bot) {
        const url = args[0];
        if (!url || !url.includes('facebook.com')) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.fb <Facebook URL>*',
            });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: `📘 *Facebook Download*\n\nURL: ${url}\n\n_Facebook videos require external tools. Use sites like fdown.net or savefrom.net_`,
        });
    },

    async play(sock, msg, args, bot) {
        const query = args.join(' ');
        if (!query) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.play <song name or YouTube URL>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching for "${query}"...` });

            const yts = require('yt-search');
            const results = await yts(query);
            const video = results.videos[0];

            if (!video) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ No results found.',
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎵 *Found:* ${video.title}\n*Duration:* ${video.duration.timestamp}\n\n⏳ Downloading audio...`,
            });

            // Try to download using ytdl
            try {
                const ytdl = require('@distube/ytdl-core');
                const tmpFile = helpers.tmpPath(`audio_${Date.now()}.mp3`);

                const stream = ytdl(video.url, {
                    quality: 'highestaudio',
                    filter: 'audioonly',
                });

                const writeStream = fs.createWriteStream(tmpFile);
                stream.pipe(writeStream);

                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                    stream.on('error', reject);
                });

                await sock.sendMessage(msg.key.remoteJid, {
                    audio: fs.readFileSync(tmpFile),
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    caption: `🎵 ${video.title}`,
                });

                fs.unlinkSync(tmpFile);
            } catch (ytdlErr) {
                // Fallback: send YouTube link
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🎵 *${video.title}*\n*Channel:* ${video.author.name}\n*Duration:* ${video.duration.timestamp}\n\n🔗 ${video.url}\n\n_(Audio download failed — sending link instead)_`,
                });
            }
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${err.message}`,
            });
        }
    },

    async ymp4(sock, msg, args, bot) {
        const query = args.join(' ');
        if (!query) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.ymp4 <video name or YouTube URL>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching for "${query}"...` });

            const yts = require('yt-search');
            const results = await yts(query);
            const video = results.videos[0];

            if (!video) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ No results found.',
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🎬 *Found:* ${video.title}\n*Duration:* ${video.duration.timestamp}\n\n⏳ Downloading video...`,
            });

            try {
                const ytdl = require('@distube/ytdl-core');
                const tmpFile = helpers.tmpPath(`video_${Date.now()}.mp4`);

                const stream = ytdl(video.url, {
                    quality: '360p',
                    filter: (format) => format.container === 'mp4' && format.hasVideo,
                });

                const writeStream = fs.createWriteStream(tmpFile);
                stream.pipe(writeStream);

                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                    stream.on('error', reject);
                });

                await sock.sendMessage(msg.key.remoteJid, {
                    video: fs.readFileSync(tmpFile),
                    caption: `🎬 ${video.title}`,
                });

                fs.unlinkSync(tmpFile);
            } catch (ytdlErr) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🎬 *${video.title}*\n*Channel:* ${video.author.name}\n*Duration:* ${video.duration.timestamp}\n\n🔗 ${video.url}\n\n_(Video download failed — sending link instead)_`,
                });
            }
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${err.message}`,
            });
        }
    },

    async pin(sock, msg, args, bot) {
        const query = args.join(' ');
        if (!query) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.pin <search query>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching Pinterest for "${query}"...` });

            // Using a simple image search as fallback
            const res = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&key=YOUR_API_KEY&cx=YOUR_CX`, {
                timeout: 10000,
            }).catch(() => null);

            if (res?.data?.items?.length) {
                const image = res.data.items[0];
                const imgBuffer = await axios.get(image.link, { responseType: 'arraybuffer', timeout: 15000 });

                await sock.sendMessage(msg.key.remoteJid, {
                    image: Buffer.from(imgBuffer.data),
                    caption: `📌 Pinterest result for "${query}"\n\n${image.title}`,
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `📌 *Pinterest Search:* "${query}"\n\n_Set up Google Custom Search API for image results._`,
                });
            }
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Search failed: ${err.message}`,
            });
        }
    },

    async ytsearch(sock, msg, args, bot) {
        const query = args.join(' ');
        if (!query) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Usage: *.ytsearch <query>*',
            });
        }

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching YouTube for "${query}"...` });

            const yts = require('yt-search');
            const results = await yts(query);
            const videos = results.videos.slice(0, 5);

            if (!videos.length) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ No results found.',
                });
            }

            let text = `🎬 *YouTube Search: "${query}"*\n\n`;
            videos.forEach((v, i) => {
                text += `${i + 1}. *${v.title}*\n   👤 ${v.author.name} | ⏱️ ${v.duration.timestamp} | 👁️ ${v.views}\n   🔗 ${v.url}\n\n`;
            });
            text += `_Use *.play <number>* or *.play <title>* to download audio._`;

            await sock.sendMessage(msg.key.remoteJid, { text });
        } catch (err) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Search failed: ${err.message}`,
            });
        }
    },
};

module.exports = downloaders;
