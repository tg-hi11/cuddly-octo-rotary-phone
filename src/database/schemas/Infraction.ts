import mongoose, { Document, Schema } from 'mongoose';
import { InfractionType } from '../../types';

export interface IInfraction extends Document {
  guildId: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  type: InfractionType;
  reason: string;
  evidence?: string;
  expiresAt?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InfractionSchema = new Schema<IInfraction>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    userTag: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    type: {
      type: String,
      enum: ['Verbal Warning', 'Warning', 'Strike', 'Demotion', 'Suspension', 'Termination', 'Staff Blacklist'],
      required: true,
    },
    reason: { type: String, required: true },
    evidence: { type: String },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Infraction = mongoose.model<IInfraction>('Infraction', InfractionSchema);
