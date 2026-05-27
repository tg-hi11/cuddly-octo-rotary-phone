import { Collection, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { BotClient, Command } from '../types';
import { Config } from '../config/config';
import { logger } from '../utils/logger';

export async function loadCommands(client: BotClient): Promise<void> {
  client.commands = new Collection<string, Command>();
  const commandsPath = path.join(__dirname, '../commands');
  const slashCommands: object[] = [];

  // Recursively walk command directories
  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(fullPath);
        const command: Command = mod.default ?? mod;
        if (command?.data && typeof command.execute === 'function') {
          client.commands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
          logger.info('CommandHandler', `Loaded command: ${command.data.name}`);
        }
      }
    }
  }

  walk(commandsPath);

  // Register slash commands globally
  const rest = new REST({ version: '10' }).setToken(Config.token);
  try {
    logger.info('CommandHandler', `Registering ${slashCommands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(Config.clientId), { body: slashCommands });
    logger.info('CommandHandler', 'Slash commands registered successfully.');
  } catch (err) {
    logger.error('CommandHandler', 'Failed to register slash commands', err);
  }
}
