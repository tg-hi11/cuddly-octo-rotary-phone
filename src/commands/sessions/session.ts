import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasSessionPerms } from '../../utils/permissions';
import {
  buildErrorEmbed,
  buildSuccessEmbed,
  bannerEmbed,
  buildVoteEmbed,
  buildBoostEmbed,
} from '../../services/embeds/embedBuilder';
import { E } from '../../config/emojis';
import {
  getActiveSession,
  startSession,
  postSessionEmbed,
  shutdownSession,
} from '../../services/sessions/sessionService';
import { Vote } from '../../database/schemas/Vote';
import { prcApi } from '../../services/prc/prcApi';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Session management commands')
  .addSubcommand((s) => s.setName('startup').setDescription('Start a new session'))
  .addSubcommand((s) => s.setName('shutdown').setDescription('Shut down the active session'))
  .addSubcommand((s) => s.setName('vote').setDescription('Start a vote-to-join session'))
  .addSubcommand((s) =>
    s.setName('boost').setDescription('Boost the session')
      .addRoleOption((o) => o.setName('role').setDescription('Role to ping').setRequired(false))
  )
  .addSubcommand((s) => s.setName('full').setDescription('Toggle server full status'))
  .addSubcommand((s) => s.setName('lock').setDescription('Lock the session'))
  .addSubcommand((s) => s.setName('unlock').setDescription('Unlock the session'));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  const sub    = interaction.options.getSubcommand();

  if (!hasSessionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need the Session role to use this.')], ephemeral: true });
    return;
  }

  const guildId        = interaction.guildId!;
  const sessionChannel = interaction.guild!.channels.cache.get(Config.channels.sessions) as TextChannel;

  // ── Instant DB-only subcommands — reply directly (no defer, no delay) ───────
  if (sub === 'full' || sub === 'lock' || sub === 'unlock') {
    const session = await getActiveSession(guildId);
    if (!session) {
      await interaction.reply({ embeds: [buildErrorEmbed('No Session', 'No active session.')], ephemeral: true });
      return;
    }
    if (sub === 'full') {
      session.isFull = !session.isFull;
      await session.save();
      await interaction.reply({ embeds: [buildSuccessEmbed('Updated', `Server marked as **${session.isFull ? 'Full' : 'Not Full'}**.`)], ephemeral: true });
    } else if (sub === 'lock') {
      session.isLocked = true;
      await session.save();
      await interaction.reply({ embeds: [buildSuccessEmbed('Locked', 'Session has been locked.')], ephemeral: true });
    } else {
      session.isLocked = false;
      await session.save();
      await interaction.reply({ embeds: [buildSuccessEmbed('Unlocked', 'Session has been unlocked.')], ephemeral: true });
    }
    return;
  }

  // ── Heavier subcommands — defer while API calls / DB work completes ─────────
  const ephemeral = sub !== 'startup' && sub !== 'shutdown' && sub !== 'vote' && sub !== 'boost';
  await interaction.deferReply({ ephemeral });

  if (!sessionChannel && (sub === 'startup' || sub === 'shutdown')) {
    await interaction.editReply({ embeds: [buildErrorEmbed('Config Error', 'Session channel not configured.')] });
    return;
  }

  switch (sub) {
    case 'startup': {
      const existing = await getActiveSession(guildId);
      if (existing) {
        await interaction.editReply({ embeds: [buildErrorEmbed('Session Active', 'A session is already running. Use `/session shutdown` first.')] });
        return;
      }
      try {
        const session = await startSession({ guildId, hostId: interaction.user.id, hostTag: interaction.user.tag });
        await postSessionEmbed(sessionChannel, session, client);
        await interaction.editReply({ embeds: [buildSuccessEmbed('Session Started', `Posted to <#${sessionChannel.id}>.`)] });
      } catch (err) {
        logger.error('SessionCommand', 'Failed to start session', err);
        await interaction.editReply({ embeds: [buildErrorEmbed('Startup Failed', 'Could not start session. Check ERLC API connection.')] });
      }
      break;
    }

    case 'shutdown': {
      const session = await getActiveSession(guildId);
      if (!session) {
        await interaction.editReply({ embeds: [buildErrorEmbed('No Session', 'There is no active session to shut down.')] });
        return;
      }
      await shutdownSession(guildId, sessionChannel);
      await interaction.editReply({ embeds: [buildSuccessEmbed('Session Ended', 'The session has been closed.')] });
      break;
    }

    case 'vote': {
      const existing = await Vote.findOne({ guildId, status: 'pending' });
      if (existing) {
        await interaction.editReply({ embeds: [buildErrorEmbed('Vote Active', 'There is already an active vote.')] });
        return;
      }

      let info, queueData;
      try {
        [info, queueData] = await Promise.all([prcApi.getServerInfo(), prcApi.getQueue()]);
      } catch (err) {
        await interaction.editReply({ embeds: [buildErrorEmbed('API Error', 'Could not reach the ERLC server. Check your API key.')] });
        return;
      }

      const threshold = Config.session.voteThreshold;
      const expiresAt = new Date(Date.now() + Config.session.voteTimeout);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('session_vote').setLabel(`Vote to Join (0/${threshold})`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('session_voters').setLabel('Voters').setStyle(ButtonStyle.Secondary)
      );

      const msg = await sessionChannel.send({
        embeds: [
          bannerEmbed(Config.banners.sessionVote),
          buildVoteEmbed(interaction.user.tag, [], threshold, info.Name, info.CurrentPlayers, info.MaxPlayers, queueData.Queue),
        ],
        components: [row],
      });

      await Vote.create({
        guildId,
        messageId: msg.id,
        channelId: sessionChannel.id,
        initiatorId: interaction.user.id,
        voters: [],
        threshold,
        status: 'pending',
        expiresAt,
      });

      setTimeout(async () => {
        const vote = await Vote.findOne({ guildId, status: 'pending', messageId: msg.id });
        if (vote) { vote.status = 'expired'; await vote.save(); try { await msg.edit({ components: [] }); } catch { /* gone */ } }
      }, Config.session.voteTimeout);

      await interaction.editReply({ embeds: [buildSuccessEmbed('Vote Started', `Vote posted to <#${sessionChannel.id}>.`)] });
      break;
    }

    case 'boost': {
      const session = await getActiveSession(guildId);
      if (!session) {
        await interaction.editReply({ embeds: [buildErrorEmbed('No Session', 'No active session to boost.')] });
        return;
      }

      let info, queueData;
      try {
        [info, queueData] = await Promise.all([prcApi.getServerInfo(), prcApi.getQueue()]);
      } catch {
        await interaction.editReply({ embeds: [buildErrorEmbed('API Error', 'Could not reach the ERLC server.')] });
        return;
      }

      const pingRole = interaction.options.getRole('role');
      await sessionChannel.send({
        content: pingRole ? `<@&${pingRole.id}>` : `<@&${Config.roles.sessionPerms}>`,
        embeds: [
          bannerEmbed(Config.banners.sessionStatus),
          buildBoostEmbed(info, queueData.Queue, session.hostTag),
        ],
      });

      await interaction.editReply({ embeds: [buildSuccessEmbed('Boosted', `Boost posted to <#${sessionChannel.id}>.`)] });
      break;
    }
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const sub = args[0]?.toLowerCase();
  if (!sub) {
    await message.reply({ embeds: [buildErrorEmbed('Usage', 'Usage: `?session <startup|shutdown|vote|boost|full|lock|unlock>`')] });
    return;
  }
  const fakeInteraction = {
    deferReply: async () => {},
    editReply: async (opts: object) => { await message.reply(opts as never); return message; },
    reply: async (opts: object) => { await message.reply(opts as never); return message; },
    deferred: true,
    options: { getSubcommand: () => sub, getRole: () => null },
    user: message.author,
    guildId: message.guildId,
    guild: message.guild,
    member: message.member,
  };
  await execute(fakeInteraction as unknown as ChatInputCommandInteraction, client);
}

const command: Command = { data, execute, prefixExecute, cooldown: 5, category: 'sessions' };
export default command;
