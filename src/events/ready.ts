import { ActivityType } from 'discord.js';
import { BotClient, Event } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config/config';
import { restoreActiveSessions } from '../services/sessions/sessionService';

const event: Event = {
  name: 'clientReady',
  once: true,
  async execute(client: unknown) {
    const bot = client as BotClient;
    logger.info('Ready', `Logged in as ${bot.user?.tag}`);
    bot.user?.setActivity(`ERLC | ${Config.prefix}help`, { type: ActivityType.Watching });

    // Re-attach 30s refresh timers for any sessions that were active before restart
    await restoreActiveSessions(bot);
  },
};

export default event;
