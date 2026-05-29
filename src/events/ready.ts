import { ActivityType } from 'discord.js';
import { BotClient, Event } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config/config';

const event: Event = {
  name: 'clientReady',
  once: true,
  execute(client: unknown) {
    const bot = client as BotClient;
    logger.info('Ready', `Logged in as ${bot.user?.tag}`);
    bot.user?.setActivity(`ERLC | ${Config.prefix}help`, { type: ActivityType.Watching });
  },
};

export default event;
