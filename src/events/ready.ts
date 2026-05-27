import { ActivityType, Client } from 'discord.js';
import { BotClient, Event } from '../types';
import { logger } from '../utils/logger';

const event: Event = {
  name: 'ready',
  once: true,
  // For 'once' events, client is passed as the first argument by our eventHandler
  execute(client: unknown) {
    const bot = client as BotClient;
    logger.info('Ready', `Logged in as ${bot.user?.tag}`);
    bot.user?.setActivity('ERLC | >help', { type: ActivityType.Watching });
  },
};

export default event;
