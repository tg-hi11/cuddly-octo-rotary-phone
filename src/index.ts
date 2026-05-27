import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { BotClient } from './types';
import { connectDatabase } from './database/connect';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { Config } from './config/config';
import { logger } from './utils/logger';

// ─── Bot Client Setup ─────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
}) as BotClient;

client.commands = new Collection();
client.cooldowns = new Collection();

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  logger.info('Bot', 'Starting ERLC Bot...');

  // Connect to MongoDB
  await connectDatabase();

  // Load all commands and events
  await loadCommands(client);
  loadEvents(client);

  // Pass client to every event execute so prefix commands can access commands
  // Patch: wrap all event listeners to inject client as last arg
  const originalOn = client.on.bind(client);
  // Events are already registered — inject client via closure in event files instead

  // Login
  await client.login(Config.token);
  logger.info('Bot', 'Login successful.');
}

main().catch((err) => {
  logger.error('Bot', 'Fatal startup error', err);
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  logger.info('Bot', 'Received SIGINT — shutting down gracefully.');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Bot', 'Received SIGTERM — shutting down gracefully.');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Bot', 'Unhandled promise rejection', reason);
});
