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
      { slash: '/erlc server',      prefix: '?erlc server',      desc: 'Server info' },
      { slash: '/erlc players',     prefix: '?erlc players',     desc: 'Online players' },
      { slash: '/erlc queue',       prefix: '?erlc queue',       desc: 'Queue count' },
      { slash: '/erlc vehicles',    prefix: '?erlc vehicles',    desc: 'Spawned vehicles' },
      { slash: '/erlc staff',       prefix: '?erlc staff',       desc: 'Online staff' },
      { slash: '/erlc killlogs',    prefix: '?erlc killlogs',    desc: 'Kill logs' },
      { slash: '/erlc joinlogs',    prefix: '?erlc joinlogs',    desc: 'Join logs' },
      { slash: '/erlc commandlogs', prefix: '?erlc commandlogs', desc: 'Command logs' },
      { slash: '/erlc modcalls',    prefix: '?erlc modcalls',    desc: 'Mod calls' },
      { slash: '/erlccommand',      prefix: '?erlccommand',      desc: 'Run in-game command' },
    ],
  },
  {
    name: 'Sessions',
    emoji: E.leaf1,
    commands: [
      { slash: '/session startup',  prefix: '?session startup',  desc: 'Start a new session' },
      { slash: '/session shutdown', prefix: '?session shutdown', desc: 'End the session' },
      { slash: '/session vote',     prefix: '?session vote',     desc: 'Start a vote' },
      { slash: '/session boost',    prefix: '?session boost',    desc: 'Boost the session' },
      { slash: '/session full',     prefix: '?session full',     desc: 'Toggle full status' },
      { slash: '/session lock',     prefix: '?session lock',     desc: 'Lock the session' },
      { slash: '/session unlock',   prefix: '?session unlock',   desc: 'Unlock the session' },
    ],
  },
  {
    name: 'Infractions',
    emoji: E.gavel,
    commands: [
      { slash: '/warn',             prefix: '?warn',             desc: 'Issue a warning' },
      { slash: '/strike',           prefix: '?strike',           desc: 'Issue a strike' },
      { slash: '/suspend',          prefix: '?suspend',          desc: 'Suspend a member' },
      { slash: '/ban',              prefix: '?ban',              desc: 'Terminate or blacklist' },
      { slash: '/removeinfraction', prefix: '?removeinfraction', desc: 'Void an infraction' },
      { slash: '/infractions',      prefix: '?infractions',      desc: 'View history' },
    ],
  },
  {
    name: 'Promotions',
    emoji: E.thumbsup,
    commands: [
      { slash: '/promote',  prefix: '?promote',  desc: 'Promote a member' },
      { slash: '/demote',   prefix: '?demote',   desc: 'Demote a member' },
      { slash: '/setrank',  prefix: '?setrank',  desc: 'Set a rank' },
    ],
  },
  {
    name: 'Previews',
    emoji: E.paint,
    commands: [
      { slash: '/preview post',     prefix: '?preview post',     desc: 'Post a preview now' },
      { slash: '/preview schedule', prefix: '?preview schedule', desc: 'Schedule a preview' },
      { slash: '/preview delete',   prefix: '?preview delete',   desc: 'Cancel a preview' },
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
