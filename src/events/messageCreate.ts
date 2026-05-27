import { Message } from 'discord.js';
import { BotClient, Event } from '../types';
import { Config } from '../config/config';
import { buildErrorEmbed } from '../services/embeds/embedBuilder';
import { checkCooldown } from '../utils/cooldown';
import { logger } from '../utils/logger';

const event: Event = {
  name: 'messageCreate',
  async execute(...rawArgs: unknown[]) {
    // Last arg is client (injected by eventHandler)
    const client = rawArgs[rawArgs.length - 1] as BotClient;
    const message = rawArgs[0] as Message;

    if (message.author.bot || !message.guild) return;

    const prefix = Config.prefix;
    if (!message.content.startsWith(prefix)) return;

    const rawContent = message.content.slice(prefix.length).trim();
    const parts = rawContent.split(/\s+/);
    const commandName = parts.shift()?.toLowerCase();
    if (!commandName) return;

    const args: string[] = parts;

    const command = client.commands.get(commandName);
    if (!command) return;

    const cooldown = command.cooldown ?? 3;
    const remaining = checkCooldown(command.data.name, message.author.id, cooldown);
    if (remaining > 0) {
      await message.reply({
        embeds: [buildErrorEmbed('Cooldown', `Please wait **${remaining}s** before using this command again.`)],
      });
      return;
    }

    if (!command.prefixExecute) {
      await message.reply({
        embeds: [buildErrorEmbed('Slash Only', `\`/${commandName}\` must be used as a slash command.`)],
      });
      return;
    }

    try {
      await command.prefixExecute(message, args, client);
    } catch (err) {
      logger.error('MessageCreate', `Error in prefix command ${commandName}`, err);
      await message.reply({
        embeds: [buildErrorEmbed('Error', 'An unexpected error occurred.')],
      });
    }
  },
};

export default event;
