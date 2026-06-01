import { TextChannel } from 'discord.js';
import { Session, ISession } from '../../database/schemas/Session';
import { Vote } from '../../database/schemas/Vote';
import { prcApi } from '../prc/prcApi';
import {
  bannerEmbed,
  buildSessionStartupEmbed,
  buildShutdownEmbed,
  buildSessionButtons,
} from '../embeds/embedBuilder';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';
import { BotClient } from '../../types';

const refreshTimers = new Map<string, NodeJS.Timeout>();
const lastRefresh   = new Map<string, Date>();

export async function getActiveSession(guildId: string): Promise<ISession | null> {
  return Session.findOne({ guildId, status: 'active' });
}

export async function startSession(params: {
  guildId: string;
  hostId: string;
  hostTag: string;
}): Promise<ISession> {
  await Session.updateMany(
    { guildId: params.guildId, status: 'active' },
    { status: 'shutdown', endTime: new Date() }
  );

  const session = new Session({
    guildId:    params.guildId,
    hostId:     params.hostId,
    hostTag:    params.hostTag,
    startTime:  new Date(),
    status:     'active',
    peakPlayers: 0,
    isLocked:   false,
    isFull:     false,
  });

  await session.save();
  return session;
}

export async function postSessionEmbed(
  channel: TextChannel,
  session: ISession,
  client: BotClient
): Promise<void> {
  try {
    const [info, players] = await Promise.all([
      prcApi.getServerInfo(),
      prcApi.getPlayers(),
    ]);

    const embed = buildSessionStartupEmbed(info, players, session, 0);
    const rows  = buildSessionButtons(0, Config.session.voteThreshold);

    const msg = await channel.send({
      embeds: [bannerEmbed(Config.banners.sessionStatus), embed],
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

// ─── Restore timers after bot restart ─────────────────────────────────────────
export async function restoreActiveSessions(client: BotClient): Promise<void> {
  try {
    const sessions = await Session.find({ status: 'active' });
    if (sessions.length === 0) {
      logger.info('SessionService', 'No active sessions to restore.');
      return;
    }
    logger.info('SessionService', `Restoring ${sessions.length} active session(s)...`);

    for (const session of sessions) {
      if (!session.channelId) continue;

      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) {
        logger.warn('SessionService', `Guild ${session.guildId} not in cache — skipping restore`);
        continue;
      }

      const channel = guild.channels.cache.get(session.channelId) as TextChannel | undefined;
      if (!channel) {
        logger.warn('SessionService', `Channel ${session.channelId} not in cache for guild ${session.guildId} — skipping restore`);
        continue;
      }

      lastRefresh.set(session.guildId, new Date());
      startRefreshTimer(session.guildId, channel, client);
      logger.info('SessionService', `Restored refresh timer for guild ${session.guildId}`);
    }
  } catch (err) {
    logger.error('SessionService', 'Failed to restore active sessions on startup', err);
  }
}

// ─── Internal timer management ────────────────────────────────────────────────

function startRefreshTimer(guildId: string, channel: TextChannel, client: BotClient): void {
  if (refreshTimers.has(guildId)) clearInterval(refreshTimers.get(guildId)!);

  const interval = setInterval(async () => {
    await refreshSessionEmbed(guildId, channel, client);
  }, Config.session.refreshInterval);

  refreshTimers.set(guildId, interval);
}

export function stopRefreshTimer(guildId: string): void {
  if (refreshTimers.has(guildId)) {
    clearInterval(refreshTimers.get(guildId)!);
    refreshTimers.delete(guildId);
  }
  lastRefresh.delete(guildId);
}

export async function refreshSessionEmbed(
  guildId: string,
  channel: TextChannel,
  client: BotClient
): Promise<void> {
  try {
    const session = await getActiveSession(guildId);
    if (!session || !session.messageId) return;

    const [info, players] = await Promise.all([
      prcApi.getServerInfo(),
      prcApi.getPlayers(),
    ]);

    if (info.CurrentPlayers > session.peakPlayers) {
      session.peakPlayers = info.CurrentPlayers;
      await session.save();
    }

    const now        = new Date();
    const secondsAgo = Math.floor((now.getTime() - (lastRefresh.get(guildId) ?? now).getTime()) / 1000);
    lastRefresh.set(guildId, now);

    const vote      = await Vote.findOne({ guildId, status: 'pending' });
    const voteCount = vote ? vote.voters.length : 0;

    const embed = buildSessionStartupEmbed(info, players, session, secondsAgo);
    const rows  = buildSessionButtons(voteCount, Config.session.voteThreshold);

    try {
      const msg = await channel.messages.fetch(session.messageId);
      await msg.edit({
        embeds: [bannerEmbed(Config.banners.sessionStatus), embed],
        components: rows,
      });
    } catch (err) {
      // Only permanently kill the timer if the message was deleted.
      // Transient errors (rate limits, network blips) should retry next tick.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Unknown Message') || msg.includes('10008')) {
        logger.warn('SessionService', `Session message deleted for guild ${guildId} — stopping timer`);
        stopRefreshTimer(guildId);
      } else {
        logger.warn('SessionService', `Refresh edit failed (will retry): ${msg}`);
      }
    }
  } catch (err) {
    logger.error('SessionService', 'Failed to refresh session embed', err);
  }
}

export async function shutdownSession(guildId: string, channel: TextChannel): Promise<ISession | null> {
  const session = await getActiveSession(guildId);
  if (!session) return null;

  session.status   = 'shutdown';
  session.endTime  = new Date();
  session.duration = session.endTime.getTime() - session.startTime.getTime();
  await session.save();

  stopRefreshTimer(guildId);

  if (session.messageId) {
    try {
      const msg = await channel.messages.fetch(session.messageId);
      await msg.edit({
        embeds: [bannerEmbed(Config.banners.sessionStatus), buildShutdownEmbed(session)],
        components: [],
      });
    } catch { /* message gone */ }
  }

  return session;
}
