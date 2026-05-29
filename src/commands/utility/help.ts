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
import { E } from '../../config/emojis';
import { Config } from '../../config/config';

const CATEGORIES: { name: string; emoji: string; commands: { slash: string; prefix: string; desc: string }[] }[] = [
  {
    name: 'ERLC API',
    emoji: E.roblox,
    commands: [
      { slash: '/erlc server',      prefix: `${Config.prefix}erlc server`,      desc: 'Server info' },
      { slash: '/erlc players',     prefix: `${Config.prefix}erlc players`,     desc: 'Online players' },
      { slash: '/erlc queue',       prefix: `${Config.prefix}erlc queue`,       desc: 'Queue count' },
      { slash: '/erlc vehicles',    prefix: `${Config.prefix}erlc vehicles`,    desc: 'Spawned vehicles' },
      { slash: '/erlc staff',       prefix: `${Config.prefix}erlc staff`,       desc: 'Online staff' },
      { slash: '/erlc killlogs',    prefix: `${Config.prefix}erlc killlogs`,    desc: 'Kill logs' },
      { slash: '/erlc joinlogs',    prefix: `${Config.prefix}erlc joinlogs`,    desc: 'Join logs' },
      { slash: '/erlc commandlogs', prefix: `${Config.prefix}erlc commandlogs`, desc: 'Command logs' },
      { slash: '/erlc modcalls',    prefix: `${Config.prefix}erlc modcalls`,    desc: 'Mod calls' },
      { slash: '/erlccommand',      prefix: `${Config.prefix}erlccommand`,      desc: 'Run in-game command' },
    ],
  },
  {
    name: 'Sessions',
    emoji: E.leaf1,
    commands: [
      { slash: '/session startup',  prefix: `${Config.prefix}session startup`,  desc: 'Start a new session' },
      { slash: '/session shutdown', prefix: `${Config.prefix}session shutdown`, desc: 'End the session' },
      { slash: '/session vote',     prefix: `${Config.prefix}session vote`,     desc: 'Start a vote' },
      { slash: '/session boost',    prefix: `${Config.prefix}session boost`,    desc: 'Boost the session' },
      { slash: '/session full',     prefix: `${Config.prefix}session full`,     desc: 'Toggle full status' },
      { slash: '/session lock',     prefix: `${Config.prefix}session lock`,     desc: 'Lock the session' },
      { slash: '/session unlock',   prefix: `${Config.prefix}session unlock`,   desc: 'Unlock the session' },
    ],
  },
  {
    name: 'Infractions',
    emoji: E.gavel,
    commands: [
      { slash: '/warn',             prefix: `${Config.prefix}warn`,             desc: 'Issue a warning' },
      { slash: '/strike',           prefix: `${Config.prefix}strike`,           desc: 'Issue a strike' },
      { slash: '/suspend',          prefix: `${Config.prefix}suspend`,          desc: 'Suspend a member' },
      { slash: '/ban',              prefix: `${Config.prefix}ban`,              desc: 'Terminate or blacklist' },
      { slash: '/removeinfraction', prefix: `${Config.prefix}removeinfraction`, desc: 'Void an infraction' },
      { slash: '/infractions',      prefix: `${Config.prefix}infractions`,      desc: 'View history' },
    ],
  },
  {
    name: 'Promotions',
    emoji: E.thumbsup,
    commands: [
      { slash: '/promote',  prefix: `${Config.prefix}promote`,  desc: 'Promote a member' },
      { slash: '/demote',   prefix: `${Config.prefix}demote`,   desc: 'Demote a member' },
      { slash: '/setrank',  prefix: `${Config.prefix}setrank`,  desc: 'Set a rank' },
    ],
  },
  {
    name: 'Previews',
    emoji: E.paint,
    commands: [
      { slash: '/preview post',     prefix: `${Config.prefix}preview post`,     desc: 'Post a preview now' },
      { slash: '/preview schedule', prefix: `${Config.prefix}preview schedule`, desc: 'Schedule a preview' },
      { slash: '/preview delete',   prefix: `${Config.prefix}preview delete`,   desc: 'Cancel a preview' },
    ],
  },
  {
    name: 'Utility',
    emoji: E.bot,
    commands: [
      { slash: '/ping',   prefix: `${Config.prefix}ping`,   desc: 'Check bot latency' },
      { slash: '/help',   prefix: `${Config.prefix}help`,   desc: 'View all commands' },
      { slash: '/prefix', prefix: `${Config.prefix}prefix`, desc: 'Show the current prefix' },
    ],
  },
];

function buildHelpEmbed(page: number): EmbedBuilder {
  const cat   = CATEGORIES[page];
  const lines = cat.commands
    .map((c) => `${E.dash} \`${c.slash}\` (${c.prefix})\n  ${c.desc}`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${cat.emoji} **${cat.name}**\n\n${lines}\n\n` +
      `${E.bot} Prefix: \`${Config.prefix}\` · Page ${page + 1}/${CATEGORIES.length}`
    );
}

function buildNavRow(page: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('help_prev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('help_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === CATEGORIES.length - 1)
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
      await btn.reply({ content: 'Not your menu.', ephemeral: true });
      return;
    }
    if (btn.customId === 'help_prev' && page > 0) page--;
    if (btn.customId === 'help_next' && page < CATEGORIES.length - 1) page++;
    await btn.update({ embeds: [buildHelpEmbed(page)], components: [buildNavRow(page)] });
  });

  collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.bot} **Command Help** — Prefix: \`${Config.prefix}\`\n\n` +
      CATEGORIES.map((cat) =>
        `${cat.emoji} **${cat.name}**\n` +
        cat.commands.map((c) => `${E.dash} \`${c.prefix}\` — ${c.desc}`).join('\n')
      ).join('\n\n')
    );

  await message.reply({ embeds: [embed] });
}

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('View all bot commands'),
  execute,
  prefixExecute,
  cooldown: 5,
};
export default command;
