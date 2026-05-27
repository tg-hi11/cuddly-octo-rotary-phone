import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  guildId: string;
  hostId: string;
  hostTag: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  peakPlayers: number;
  messageId?: string;
  channelId?: string;
  status: 'active' | 'shutdown';
  isLocked: boolean;
  isFull: boolean;
  coHosts: string[];
}

const SessionSchema = new Schema<ISession>(
  {
    guildId: { type: String, required: true },
    hostId: { type: String, required: true },
    hostTag: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    peakPlayers: { type: Number, default: 0 },
    messageId: { type: String },
    channelId: { type: String },
    status: { type: String, enum: ['active', 'shutdown'], default: 'active' },
    isLocked: { type: Boolean, default: false },
    isFull: { type: Boolean, default: false },
    coHosts: [{ type: String }],
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
