import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { E } from '../../config/emojis';

const data = new SlashCommandBuilder().setName('ping').setDescription('Check bot latency');

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const sent      = await interaction.reply({ content: '...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const ws        = interaction.client.ws.ping;

  await interaction.editReply({
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setDescription(
          `${E.bot} **Pong!**\n\n` +
          `${E.dash} Roundtrip — \`${roundtrip}ms\`\n` +
          `${E.dash} WebSocket — \`${ws}ms\``
        )
        .setTimestamp(),
    ],
  });
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const start   = Date.now();
  const msg     = await message.reply('...');
  const latency = Date.now() - start;

  await msg.edit({
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setDescription(
          `${E.bot} **Pong!**\n\n` +
          `${E.dash} Roundtrip — \`${latency}ms\`\n` +
          `${E.dash} WebSocket — \`${client.ws.ping}ms\``
        )
        .setTimestamp(),
    ],
  });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
