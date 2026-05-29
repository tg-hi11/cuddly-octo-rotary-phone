import { TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
      prcApi.getQueue(),
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
    } catch {
      stopRefreshTimer(guildId);
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
