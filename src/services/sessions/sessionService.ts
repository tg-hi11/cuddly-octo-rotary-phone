import {
  TextChannel,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { Session, ISession } from '../../database/schemas/Session';
import { Vote } from '../../database/schemas/Vote';
import { prcApi } from '../prc/prcApi';
import {
  bannerEmbed,
  buildSessionStartupEmbed,
  buildShutdownEmbed,
  buildVoteEmbed,
  buildBoostEmbed,
  buildSessionButtons,
  buildErrorEmbed,
} from '../embeds/embedBuilder';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';
import { BotClient } from '../../types';

// Map<guildId, intervalId> for live refresh timers
const refreshTimers = new Map<string, NodeJS.Timeout>();
// Map<guildId, lastRefreshTime>
const lastRefresh = new Map<string, Date>();

/** Start or retrieve the active session for a guild */
export async function getActiveSession(guildId: string): Promise<ISession | null> {
  return Session.findOne({ guildId, status: 'active' });
}

/** Start a new session */
export async function startSession(params: {
  guildId: string;
  hostId: string;
  hostTag: string;
}): Promise<ISession> {
  // Shut down any existing active session first
  await Session.updateMany(
    { guildId: params.guildId, status: 'active' },
    { status: 'shutdown', endTime: new Date() }
  );

  const session = new Session({
    guildId: params.guildId,
    hostId: params.hostId,
    hostTag: params.hostTag,
    startTime: new Date(),
    status: 'active',
    peakPlayers: 0,
    isLocked: false,
    isFull: false,
  });

  await session.save();
  return session;
}

/** Post session startup embed to channel and begin 30s refresh */
export async function postSessionEmbed(
  channel: TextChannel,
  session: ISession,
  client: BotClient
): Promise<void> {
  try {
    const [info, players, queueData] = await Promise.all([
      prcApi.getServerInfo(),
      prcApi.getPlayers(),
      prcApi.getQueue(),
    ]);

    const secondsAgo = 0;
    const banner = bannerEmbed(Config.banners.sessionStatus);
    const embed = buildSessionStartupEmbed(info, players, session, secondsAgo);
    const rows = buildSessionButtons(0, Config.session.voteThreshold);

    const msg = await channel.send({
      embeds: [banner, embed],
      components: rows,
    });

    session.messageId = msg.id;
    session.channelId = channel.id;
    if (info.CurrentPlayers > session.peakPlayers) session.peakPlayers = info.CurrentPlayers;
    await session.save();

    lastRefresh.set(session.guildId, new Date());
    startRefreshTimer(session.guildId, channel, client);
  } catch (err) {
    logger.error('SessionService', 'Failed to post session embed', err);
    throw err;
  }
}

/** Begin the 30-second auto-refresh interval */
function startRefreshTimer(guildId: string, channel: TextChannel, client: BotClient): void {
  // Clear any existing timer
  if (refreshTimers.has(guildId)) {
    clearInterval(refreshTimers.get(guildId)!);
  }

  const interval = setInterval(async () => {
    await refreshSessionEmbed(guildId, channel, client);
  }, Config.session.refreshInterval);

  refreshTimers.set(guildId, interval);
}

/** Stop the refresh timer for a guild */
export function stopRefreshTimer(guildId: string): void {
  if (refreshTimers.has(guildId)) {
    clearInterval(refreshTimers.get(guildId)!);
    refreshTimers.delete(guildId);
  }
  lastRefresh.delete(guildId);
}

/** Refresh the live session embed */
export async function refreshSessionEmbed(
  guildId: string,
  channel: TextChannel,
  client: BotClient
): Promise<void> {
  try {
    const session = await getActiveSession(guildId);
    if (!session || !session.messageId) return;

    const [info, players, queueData] = await Promise.all([
      prcApi.getServerInfo(),
      prcApi.getPlayers(),
      prcApi.getQueue(),
    ]);

    // Update peak players
    if (info.CurrentPlayers > session.peakPlayers) {
      session.peakPlayers = info.CurrentPlayers;
      await session.save();
    }

    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - (lastRefresh.get(guildId) ?? now).getTime()) / 1000);
    lastRefresh.set(guildId, now);

    // Get current vote count
    const vote = await Vote.findOne({ guildId, status: 'pending' });
    const voteCount = vote ? vote.voters.length : 0;

    const banner = bannerEmbed(Config.banners.sessionStatus);
    const embed = buildSessionStartupEmbed(info, players, session, secondsAgo);
    const rows = buildSessionButtons(voteCount, Config.session.voteThreshold);

    try {
      const msg = await channel.messages.fetch(session.messageId);
      await msg.edit({ embeds: [banner, embed], components: rows });
    } catch {
      // Message was deleted; stop refresh
      stopRefreshTimer(guildId);
    }
  } catch (err) {
    logger.error('SessionService', 'Failed to refresh session embed', err);
  }
}

/** Shut down the active session */
export async function shutdownSession(guildId: string, channel: TextChannel): Promise<ISession | null> {
  const session = await getActiveSession(guildId);
  if (!session) return null;

  session.status = 'shutdown';
  session.endTime = new Date();
  session.duration = session.endTime.getTime() - session.startTime.getTime();
  await session.save();

  stopRefreshTimer(guildId);

  // Replace embed with shutdown message
  if (session.messageId) {
    try {
      const msg = await channel.messages.fetch(session.messageId);
      const banner = bannerEmbed(Config.banners.sessionStatus);
      const embed = buildShutdownEmbed(session);
      await msg.edit({ embeds: [banner, embed], components: [] });
    } catch {
      // Message gone
    }
  }

  return session;
}
