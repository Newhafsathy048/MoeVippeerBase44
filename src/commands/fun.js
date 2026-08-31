const helpers = require('../utils/helpers');

const fun = {
    async '8ball'(sock, msg, args, bot) {
        const question = args.join(' ') || 'Will I be successful?';
        const responses = [
            'It is certain. ✨',
            'Without a doubt. ✅',
            'You may rely on it. 🤝',
            'Yes, definitely. 👍',
            'As I see it, yes. 👀',
            'Most likely. 📈',
            'Outlook good. 🌤️',
            'Yes. 🎯',
            'Signs point to yes. 🪧',
            'Reply hazy, try again. 🌫️',
            'Ask again later. ⏳',
            'Better not tell you now. 🤫',
            'Cannot predict now. 🔮',
            'Concentrate and ask again. 🧘',
            "Don't count on it. ❌",
            'My reply is no. 🚫',
            'My sources say no. 📰',
            'Outlook not so good. 🌧️',
            'Very doubtful. 🤔',
        ];

        const answer = helpers.random(responses);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎱 *Magic 8-Ball*\n\n*Question:* ${question}\n\n*Answer:* ${answer}`,
        });
    },

    async quote(sock, msg, args, bot) {
        const quotes = [
            { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
            { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
            { text: "Everything you've ever wanted is on the other side of fear.", author: 'George Addair' },
            { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
            { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
            { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
            { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
            { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
            { text: "Your limitation—it's only your imagination.", author: 'Unknown' },
            { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
        ];

        const quote = helpers.random(quotes);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💬 *Quote of the Day*\n\n"${quote.text}"\n\n— *${quote.author}*`,
        });
    },
};

module.exports = fun;
