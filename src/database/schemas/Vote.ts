import mongoose, { Document, Schema } from 'mongoose';

export interface IVote extends Document {
  guildId: string;
  messageId: string;
  channelId: string;
  initiatorId: string;
  voters: string[];
  threshold: number;
  status: 'pending' | 'passed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    guildId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    initiatorId: { type: String, required: true },
    voters: [{ type: String }],
    threshold: { type: Number, default: 5 },
    status: { type: String, enum: ['pending', 'passed', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Vote = mongoose.model<IVote>('Vote', VoteSchema);
