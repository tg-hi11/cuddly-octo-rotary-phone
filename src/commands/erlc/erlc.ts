import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  ComponentType,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { prcApi } from '../../services/prc/prcApi';
import {
  bannerEmbed,
  buildServerInfoEmbed,
  buildErrorEmbed,
  DIVIDER,
} from '../../services/embeds/embedBuilder';
import { Config } from '../../config/config';
import { chunkArray, discordTimestamp } from '../../utils/formatters';

const data = new SlashCommandBuilder()
  .setName('erlc')
  .setDescription('ERLC server commands')
  .addSubcommand((sub) => sub.setName('server').setDescription('View server information'))
  .addSubcommand((sub) => sub.setName('players').setDescription('View online players'))
  .addSubcommand((sub) => sub.setName('queue').setDescription('View server queue'))
  .addSubcommand((sub) => sub.setName('vehicles').setDescription('View spawned vehicles'))
  .addSubcommand((sub) => sub.setName('staff').setDescription('View online staff'))
  .addSubcommand((sub) => sub.setName('killlogs').setDescription('View recent kill logs'))
  .addSubcommand((sub) => sub.setName('joinlogs').setDescription('View recent join logs'))
  .addSubcommand((sub) => sub.setName('commandlogs').setDescription('View recent command logs'))
  .addSubcommand((sub) => sub.setName('modcalls').setDescription('View active mod calls'));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  await interaction.deferReply();
  const sub = interaction.options.getSubcommand();

  try {
    switch (sub) {
      case 'server': {
        const [info, players, queueData] = await Promise.all([
          prcApi.getServerInfo(),
          prcApi.getPlayers(),
          prcApi.getQueue(),
        ]);
        const banner = bannerEmbed(Config.banners.sessionStatus);
        const embed = buildServerInfoEmbed(info, players, queueData.Queue);
        await interaction.editReply({ embeds: [banner, embed] });
        break;
      }

      case 'players': {
        const players = await prcApi.getPlayers();
        if (players.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Players', 'No players are currently online.')] });
          return;
        }
        const pages = chunkArray(players, 15);
        let page = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(Config.colors.primary)
            .setTitle(`👥  Players Online (${players.length})`)
            .setDescription(
              `${DIVIDER}\n` +
              pages[pg].map((p) => `\`${p.Player}\` — **${p.Team}** | ${p.Permission}`).join('\n') +
              `\n${DIVIDER}`
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setTimestamp();

        const row = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({ embeds: [buildEmbed(0)], components: pages.length > 1 ? [row()] : [] });

        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) {
            await btn.reply({ content: 'Not your command.', ephemeral: true });
            return;
          }
          if (btn.customId === 'prev' && page > 0) page--;
          if (btn.customId === 'next' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [row()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'queue': {
        const queueData = await prcApi.getQueue();
        const embed = new EmbedBuilder()
          .setColor(Config.colors.primary)
          .setTitle('📋  Server Queue')
          .setDescription(`${DIVIDER}\n**Players in Queue:** \`${queueData.Queue}\`\n${DIVIDER}`)
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'vehicles': {
        const vehicles = await prcApi.getVehicles();
        if (vehicles.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Vehicles', 'No vehicles are currently spawned.')] });
          return;
        }
        const pages = chunkArray(vehicles, 15);
        let page = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(Config.colors.primary)
            .setTitle(`🚗  Vehicles (${vehicles.length})`)
            .setDescription(
              `${DIVIDER}\n` +
              pages[pg].map((v) => `\`${v.Name}\` — **${v.Owner}**`).join('\n') +
              `\n${DIVIDER}`
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` });

        await interaction.editReply({ embeds: [buildEmbed(0)] });
        break;
      }

      case 'staff': {
        const staff = await prcApi.getStaff();
        if (staff.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Staff', 'No staff members are currently online.')] });
          return;
        }
        const embed = new EmbedBuilder()
          .setColor(Config.colors.primary)
          .setTitle(`👮  Staff Online (${staff.length})`)
          .setDescription(
            `${DIVIDER}\n` +
            staff.map((s) => `\`${s.Player}\` — **${s.Permission}**`).join('\n') +
            `\n${DIVIDER}`
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'killlogs': {
        const logs = await prcApi.getKillLogs();
        if (logs.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Logs', 'No kill logs available.')] });
          return;
        }
        const pages = chunkArray(logs.slice(0, 50), 10);
        let page = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(Config.colors.error)
            .setTitle('💀  Kill Logs')
            .setDescription(
              `${DIVIDER}\n` +
              pages[pg]
                .map((l) => `${discordTimestamp(l.Kill_Time, 'R')} **${l.Killer}** killed **${l.Killed}**`)
                .join('\n') +
              `\n${DIVIDER}`
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` });

        const row = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('kprev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('knext').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({ embeds: [buildEmbed(0)], components: pages.length > 1 ? [row()] : [] });
        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
          if (btn.customId === 'kprev' && page > 0) page--;
          if (btn.customId === 'knext' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [row()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'joinlogs': {
        const logs = await prcApi.getJoinLogs();
        if (logs.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Logs', 'No join logs available.')] });
          return;
        }
        const pages = chunkArray(logs.slice(0, 50), 10);
        let page = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(Config.colors.success)
            .setTitle('📥  Join Logs')
            .setDescription(
              `${DIVIDER}\n` +
              pages[pg].map((l) => `${discordTimestamp(l.Join_Time, 'R')} **${l.Player}** joined`).join('\n') +
              `\n${DIVIDER}`
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` });

        await interaction.editReply({ embeds: [buildEmbed(0)] });
        break;
      }

      case 'commandlogs': {
        const logs = await prcApi.getCommandLogs();
        if (logs.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Logs', 'No command logs available.')] });
          return;
        }
        const pages = chunkArray(logs.slice(0, 50), 10);
        let page = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(Config.colors.info)
            .setTitle('⌨️  Command Logs')
            .setDescription(
              `${DIVIDER}\n` +
              pages[pg]
                .map((l) => `${discordTimestamp(l.Timestamp, 'R')} **${l.Player}**: \`${l.Command}\``)
                .join('\n') +
              `\n${DIVIDER}`
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` });

        await interaction.editReply({ embeds: [buildEmbed(0)] });
        break;
      }

      case 'modcalls': {
        const calls = await prcApi.getModCalls();
        if (calls.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Mod Calls', 'No active mod calls.')] });
          return;
        }
        const embed = new EmbedBuilder()
          .setColor(Config.colors.warning)
          .setTitle(`📞  Mod Calls (${calls.length})`)
          .setDescription(
            `${DIVIDER}\n` +
            calls.map((c) => `**Caller:** \`${c.Caller}\` → **Moderator:** \`${c.Moderator || 'Unassigned'}\``).join('\n') +
            `\n${DIVIDER}`
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API request failed.';
    const errEmbed = buildErrorEmbed('API Error', msg);
    if (interaction.deferred) await interaction.editReply({ embeds: [errEmbed] });
    else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  if (!args[0]) {
    await message.reply({ embeds: [buildErrorEmbed('Usage', 'Usage: `>erlc <subcommand>`')] });
    return;
  }

  const fakeInteraction = {
    deferReply: async () => {},
    editReply: async (opts: object) => { await message.reply(opts as never); return message; },
    reply: async (opts: object) => { await message.reply(opts as never); return message; },
    deferred: true,
    options: {
      getSubcommand: () => args[0].toLowerCase(),
      getString: (name: string) => args[1] ?? null,
    },
    user: message.author,
    guildId: message.guildId,
    guild: message.guild,
    member: message.member,
  };

  await execute(fakeInteraction as unknown as ChatInputCommandInteraction, client);
}

const command: Command = { data, execute, prefixExecute, cooldown: 5 };
export default command;
