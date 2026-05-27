import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { Config } from '../../config/config';
import { DIVIDER } from '../../services/embeds/embedBuilder';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency and status');

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = interaction.client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle('🏓  Pong!')
    .setDescription(DIVIDER)
    .addFields(
      { name: '📡  Roundtrip', value: `\`${roundtrip}ms\``, inline: true },
      { name: '💓  WebSocket', value: `\`${wsLatency}ms\``, inline: true },
      { name: '\u200B', value: DIVIDER }
    )
    .setTimestamp();

  await interaction.editReply({ content: '', embeds: [embed] });
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const start = Date.now();
  const msg = await message.reply('Pinging...');
  const latency = Date.now() - start;

  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle('🏓  Pong!')
    .setDescription(DIVIDER)
    .addFields(
      { name: '📡  Roundtrip', value: `\`${latency}ms\``, inline: true },
      { name: '💓  WebSocket', value: `\`${client.ws.ping}ms\``, inline: true },
      { name: '\u200B', value: DIVIDER }
    )
    .setTimestamp();

  await msg.edit({ content: '', embeds: [embed] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
