import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { Config } from '../../config/config';
import { E } from '../../config/emojis';

const data = new SlashCommandBuilder()
  .setName('prefix')
  .setDescription('Show the current bot prefix for text commands');

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setDescription(
          `${E.bot} **Bot Prefix**\n\n` +
          `${E.dash} Current prefix: \`${Config.prefix}\`\n` +
          `${E.dash} Example: \`${Config.prefix}ping\`, \`${Config.prefix}help\`\n\n` +
          `${E.notif} Slash commands (/) are also supported for all commands.`
        )
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setDescription(
          `${E.bot} **Bot Prefix**\n\n` +
          `${E.dash} Current prefix: \`${Config.prefix}\`\n` +
          `${E.dash} Example: \`${Config.prefix}ping\`, \`${Config.prefix}help\`\n\n` +
          `${E.notif} Slash commands (/) are also supported for all commands.`
        )
        .setTimestamp(),
    ],
  });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
