const pino = require('pino');

// Keep production logging dependency-free. Pretty transport is optional and
// must not prevent the bot/dashboard from starting when it is not installed.
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
});

// Also write console output to a local file for Fly logs/debugging.
const fs = require('fs');
const logFile = fs.createWriteStream('bot.log', { flags: 'a' });

const originalLog = console.log;
console.log = (...args) => {
    const msg = args.join(' ');
    logFile.write(`[${new Date().toISOString()}] ${msg}\n`);
    originalLog(...args);
};

module.exports = logger;
