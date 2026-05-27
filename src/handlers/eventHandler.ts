import fs from 'fs';
import path from 'path';
import { BotClient, Event } from '../types';
import { logger } from '../utils/logger';

export function loadEvents(client: BotClient): void {
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    const fullPath = path.join(eventsPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(fullPath);
    const event: Event = mod.default ?? mod;

    if (event?.name) {
      if (event.once) {
        // Pass client as first arg for 'ready', otherwise append it
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.info('EventHandler', `Loaded event: ${event.name}`);
    }
  }
}
