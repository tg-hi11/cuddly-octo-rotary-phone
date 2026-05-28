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
} from '../../services/embeds/embedBuilder';
import { E } from '../../config/emojis';
import { Config } from '../../config/config';
import { chunkArray, discordTimestamp } from '../../utils/formatters';

const data = new SlashCommandBuilder()
  .setName('erlc')
  .setDescription('ERLC server commands')
  .addSubcommand((s) => s.setName('server').setDescription('View server information'))
  .addSubcommand((s) => s.setName('players').setDescription('View online players'))
  .addSubcommand((s) => s.setName('queue').setDescription('View server queue'))
  .addSubcommand((s) => s.setName('vehicles').setDescription('View spawned vehicles'))
  .addSubcommand((s) => s.setName('staff').setDescription('View online staff'))
  .addSubcommand((s) => s.setName('killlogs').setDescription('View recent kill logs'))
  .addSubcommand((s) => s.setName('joinlogs').setDescription('View recent join logs'))
  .addSubcommand((s) => s.setName('commandlogs').setDescription('View recent command logs'))
  .addSubcommand((s) => s.setName('modcalls').setDescription('View active mod calls'));

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
        await interaction.editReply({
          embeds: [
            bannerEmbed(Config.banners.sessionStatus),
            buildServerInfoEmbed(info, players, queueData.Queue),
          ],
        });
        break;
      }

      case 'players': {
        const players = await prcApi.getPlayers();
        if (players.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Players', 'No players are currently online.')] });
          return;
        }
        const pages = chunkArray(players, 15);
        let page    = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(
              `${E.person} **Players Online** — \`${players.length}\`\n\n` +
              pages[pg].map((p) => `${E.dash} \`${p.Player}\` — ${p.Team} · ${p.Permission}`).join('\n')
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setImage(Config.banners.bottom);

        const navRow = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({
          embeds: [buildEmbed(0)],
          components: pages.length > 1 ? [navRow()] : [],
        });

        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not your command.', ephemeral: true }); return; }
          if (btn.customId === 'prev' && page > 0) page--;
          if (btn.customId === 'next' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [navRow()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'queue': {
        const queueData = await prcApi.getQueue();
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFFFFF)
              .setDescription(`${E.folder} **Queue** — \`${queueData.Queue} players waiting\``)
              .setTimestamp()
              .setImage(Config.banners.bottom),
          ],
        });
        break;
      }

      case 'vehicles': {
        const vehicles = await prcApi.getVehicles();
        if (vehicles.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Vehicles', 'No vehicles are currently spawned.')] });
          return;
        }
        const pages = chunkArray(vehicles, 15);
        let page    = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(
              `${E.roblox} **Vehicles** — \`${vehicles.length} spawned\`\n\n` +
              pages[pg].map((v) => `${E.dash} \`${v.Name}\` — ${v.Owner}`).join('\n')
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setImage(Config.banners.bottom);

        const navRow = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('vprev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('vnext').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({
          embeds: [buildEmbed(0)],
          components: pages.length > 1 ? [navRow()] : [],
        });

        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
          if (btn.customId === 'vprev' && page > 0) page--;
          if (btn.customId === 'vnext' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [navRow()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'staff': {
        const staff = await prcApi.getStaff();
        if (staff.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Staff', 'No staff members are currently online.')] });
          return;
        }
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFFFFF)
              .setDescription(
                `${E.dev} **Staff Online** — \`${staff.length}\`\n\n` +
                staff.map((s) => `${E.dash} \`${s.Player}\` — ${s.Permission}`).join('\n')
              )
              .setTimestamp()
              .setImage(Config.banners.bottom),
          ],
        });
        break;
      }

      case 'killlogs': {
        const logs = await prcApi.getKillLogs();
        if (logs.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Logs', 'No kill logs available.')] });
          return;
        }
        const pages = chunkArray(logs.slice(0, 50), 10);
        let page    = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(
              `${E.gavel} **Kill Logs**\n\n` +
              pages[pg].map((l) => `${E.dash} ${discordTimestamp(l.Kill_Time, 'R')} **${l.Killer}** → **${l.Killed}**`).join('\n')
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setImage(Config.banners.bottom);

        const navRow = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('kprev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('knext').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({ embeds: [buildEmbed(0)], components: pages.length > 1 ? [navRow()] : [] });
        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
          if (btn.customId === 'kprev' && page > 0) page--;
          if (btn.customId === 'knext' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [navRow()] });
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
        let page    = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(
              `${E.leaf1} **Join Logs**\n\n` +
              pages[pg].map((l) => `${E.dash} ${discordTimestamp(l.Join_Time, 'R')} **${l.Player}** joined`).join('\n')
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setImage(Config.banners.bottom);

        const navRow = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('jprev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('jnext').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({ embeds: [buildEmbed(0)], components: pages.length > 1 ? [navRow()] : [] });
        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
          if (btn.customId === 'jprev' && page > 0) page--;
          if (btn.customId === 'jnext' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [navRow()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'commandlogs': {
        const logs = await prcApi.getCommandLogs();
        if (logs.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Logs', 'No command logs available.')] });
          return;
        }
        const pages = chunkArray(logs.slice(0, 50), 10);
        let page    = 0;

        const buildEmbed = (pg: number) =>
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(
              `${E.dev} **Command Logs**\n\n` +
              pages[pg].map((l) => `${E.dash} ${discordTimestamp(l.Timestamp, 'R')} **${l.Player}** — \`${l.Command}\``).join('\n')
            )
            .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
            .setImage(Config.banners.bottom);

        const navRow = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('cprev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('cnext').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
          );

        const msg = await interaction.editReply({ embeds: [buildEmbed(0)], components: pages.length > 1 ? [navRow()] : [] });
        if (pages.length <= 1) return;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
          if (btn.customId === 'cprev' && page > 0) page--;
          if (btn.customId === 'cnext' && page < pages.length - 1) page++;
          await btn.update({ embeds: [buildEmbed(page)], components: [navRow()] });
        });
        collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
        break;
      }

      case 'modcalls': {
        const calls = await prcApi.getModCalls();
        if (calls.length === 0) {
          await interaction.editReply({ embeds: [buildErrorEmbed('No Mod Calls', 'No active mod calls.')] });
          return;
        }
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFFFFF)
              .setDescription(
                `${E.notif} **Mod Calls** — \`${calls.length} active\`\n\n` +
                calls.map((c) => `${E.dash} **${c.Caller}** → \`${c.Moderator || 'Unassigned'}\``).join('\n')
              )
              .setTimestamp()
              .setImage(Config.banners.bottom),
          ],
        });
        break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API request failed.';
    await interaction.editReply({ embeds: [buildErrorEmbed('API Error', msg)] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const sub = args[0]?.toLowerCase();
  if (!sub) {
    await message.reply({ embeds: [buildErrorEmbed('Usage', 'Usage: `?erlc <server|players|queue|vehicles|staff|killlogs|joinlogs|commandlogs|modcalls>`')] });
    return;
  }
  const fakeInteraction = {
    deferReply: async () => {},
    editReply:  async (opts: object) => { await message.reply(opts as never); return message; },
    reply:      async (opts: object) => { await message.reply(opts as never); return message; },
    deferred:   true,
    options:    { getSubcommand: () => sub },
    user:       message.author,
    guildId:    message.guildId,
    guild:      message.guild,
    member:     message.member,
  };
  await execute(fakeInteraction as unknown as ChatInputCommandInteraction, client);
}

const command: Command = { data, execute, prefixExecute, cooldown: 5 };
export default command;
