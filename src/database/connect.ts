import mongoose from 'mongoose';
import { Config } from '../config/config';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(Config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('[Database] Connected to MongoDB successfully.');

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}
