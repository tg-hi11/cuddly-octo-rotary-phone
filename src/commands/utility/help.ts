import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { Config } from '../../config/config';
import { DIVIDER } from '../../services/embeds/embedBuilder';

const CATEGORIES: Record<string, { emoji: string; commands: { name: string; prefix: string; desc: string }[] }> = {
  'ERLC API': {
    emoji: '🏙️',
    commands: [
      { name: '/erlc server', prefix: '>erlc server', desc: 'View server info' },
      { name: '/erlc players', prefix: '>erlc players', desc: 'View online players' },
      { name: '/erlc queue', prefix: '>erlc queue', desc: 'View queue count' },
      { name: '/erlc vehicles', prefix: '>erlc vehicles', desc: 'View spawned vehicles' },
      { name: '/erlc staff', prefix: '>erlc staff', desc: 'View online staff' },
      { name: '/erlc killlogs', prefix: '>erlc killlogs', desc: 'View kill logs' },
      { name: '/erlc joinlogs', prefix: '>erlc joinlogs', desc: 'View join logs' },
      { name: '/erlc commandlogs', prefix: '>erlc commandlogs', desc: 'View command logs' },
      { name: '/erlc modcalls', prefix: '>erlc modcalls', desc: 'View mod calls' },
      { name: '/erlccommand', prefix: '>erlccommand <cmd>', desc: 'Execute in-game command' },
    ],
  },
  'Sessions': {
    emoji: '🟢',
    commands: [
      { name: '/session startup', prefix: '>session startup', desc: 'Start a new session' },
      { name: '/session shutdown', prefix: '>session shutdown', desc: 'End the active session' },
      { name: '/session vote', prefix: '>session vote', desc: 'Start a vote-to-join' },
      { name: '/session boost', prefix: '>session boost', desc: 'Boost the session' },
      { name: '/session full', prefix: '>session full', desc: 'Toggle server full status' },
      { name: '/session lock', prefix: '>session lock', desc: 'Lock the session' },
      { name: '/session unlock', prefix: '>session unlock', desc: 'Unlock the session' },
    ],
  },
  'Infractions': {
    emoji: '🚨',
    commands: [
      { name: '/warn', prefix: '>warn', desc: 'Issue a verbal warning or warning' },
      { name: '/strike', prefix: '>strike', desc: 'Issue a strike' },
      { name: '/suspend', prefix: '>suspend', desc: 'Suspend a staff member' },
      { name: '/ban', prefix: '>ban', desc: 'Terminate or blacklist a member' },
      { name: '/removeinfraction', prefix: '>removeinfraction', desc: 'Void an infraction by case ID' },
      { name: '/infractions', prefix: '>infractions', desc: 'View infraction history' },
    ],
  },
  'Promotions': {
    emoji: '📈',
    commands: [
      { name: '/promote', prefix: '>promote', desc: 'Promote a staff member' },
      { name: '/demote', prefix: '>demote', desc: 'Demote a staff member' },
      { name: '/setrank', prefix: '>setrank', desc: 'Set a specific rank' },
    ],
  },
  'Previews': {
    emoji: '🖼️',
    commands: [
      { name: '/preview post', prefix: '>preview post', desc: 'Post a preview immediately' },
      { name: '/preview schedule', prefix: '>preview schedule', desc: 'Schedule a preview post' },
      { name: '/preview delete', prefix: '>preview delete', desc: 'Cancel a scheduled preview' },
    ],
  },
};

const categoryKeys = Object.keys(CATEGORIES);

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View all bot commands');

function buildHelpEmbed(categoryIndex: number): EmbedBuilder {
  const key = categoryKeys[categoryIndex];
  const cat = CATEGORIES[key];

  const commandList = cat.commands
    .map((c) => `**${c.name}** (\`${c.prefix}\`)\n> ${c.desc}`)
    .join('\n\n');

  return new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle(`${cat.emoji}  ${key} Commands`)
    .setDescription(`${DIVIDER}\n${commandList}\n\n${DIVIDER}`)
    .setFooter({ text: `Category ${categoryIndex + 1}/${categoryKeys.length} • Prefix: ${Config.prefix} • All / commands have a prefix equivalent` })
    .setTimestamp();
}

function buildNavRow(page: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('help_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('help_home')
      .setLabel(`${page + 1}/${categoryKeys.length}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder().setCustomId('help_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === categoryKeys.length - 1)
  );
}

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  let page = 0;
  const msg = await interaction.reply({
    embeds: [buildHelpEmbed(page)],
    components: [buildNavRow(page)],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      await btn.reply({ content: 'Not your help menu.', ephemeral: true });
      return;
    }
    if (btn.customId === 'help_prev' && page > 0) page--;
    if (btn.customId === 'help_next' && page < categoryKeys.length - 1) page++;
    await btn.update({ embeds: [buildHelpEmbed(page)], components: [buildNavRow(page)] });
  });

  collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  // Build a summary embed with all categories
  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle('📖  ERLC Bot — Command Help')
    .setDescription(`${DIVIDER}\nPrefix: \`${Config.prefix}\` | Use \`/help\` for interactive help\n${DIVIDER}`)
    .setTimestamp();

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    embed.addFields({
      name: `${cat.emoji}  ${key}`,
      value: cat.commands.map((c) => `\`${c.prefix}\` — ${c.desc}`).join('\n'),
      inline: false,
    });
  }

  await message.reply({ embeds: [embed] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 5 };
export default command;
