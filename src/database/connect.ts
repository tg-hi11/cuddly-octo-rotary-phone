import mongoose from 'mongoose';
import { Config } from '../config/config';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(Config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('[Database] Connected to MongoDB successfully.');

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (error) {
    // Log the error but do NOT exit — bot still functions without DB (slash command registration, ERLC API, etc.)
    console.error('[Database] Failed to connect to MongoDB:', (error as Error).message);
    console.warn('[Database] Bot is running WITHOUT database — infraction/session/promotion data will not persist.');
    console.warn('[Database] Fix: Go to MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)');
  }
}
