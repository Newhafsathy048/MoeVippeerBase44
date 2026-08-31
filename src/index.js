require('dotenv').config();
const DashboardServer = require('./server');
const manager = require('./connections/manager');
const { readStore } = require('./storage/store');
const logger = require('./utils/logger');
const config = require('./config');

async function main() {
  const server = new DashboardServer();
  server.start();
  const connections = readStore().connections;
  for (const connection of connections) {
    manager.connect(connection.id).catch((error) => logger.error(`Startup recovery failed for ${connection.name}:`, error.message));
  }
  logger.info(`${config.bot.name} multi-connection service started`);
}

main().catch((error) => { logger.error('Fatal startup error:', error); process.exitCode = 1; });

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { logger.info(`Received ${signal}; shutting down`); process.exit(0); });
