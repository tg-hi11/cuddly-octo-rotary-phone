import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { E } from '../../config/emojis';
import { Config } from '../../config/config';
import { bottomBannerEmbed } from '../../services/embeds/embedBuilder';

const data = new SlashCommandBuilder().setName('ping').setDescription('Check bot latency');

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const sent      = await interaction.reply({ content: '...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const ws        = interaction.client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setDescription(
      `${E.bot} **Pong!**\n\n` +
      `${E.dash} Roundtrip — \`${roundtrip}ms\`\n` +
      `${E.dash} WebSocket — \`${ws}ms\``
    )
    .setTimestamp();

  await interaction.editReply({ content: '', embeds: [embed, bottomBannerEmbed()] });
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const start = Date.now();
  const msg   = await message.reply('...');
  const latency = Date.now() - start;

  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setDescription(
      `${E.bot} **Pong!**\n\n` +
      `${E.dash} Roundtrip — \`${latency}ms\`\n` +
      `${E.dash} WebSocket — \`${client.ws.ping}ms\``
    )
    .setTimestamp();

  await msg.edit({ content: '', embeds: [embed, bottomBannerEmbed()] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
