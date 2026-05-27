import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
  guildId: string;
  userId: string;
  userTag: string;
  promoterId: string;
  promoterTag: string;
  action: 'promote' | 'demote' | 'setrank';
  fromRank?: string;
  toRank: string;
  reason?: string;
  createdAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    userTag: { type: String, required: true },
    promoterId: { type: String, required: true },
    promoterTag: { type: String, required: true },
    action: { type: String, enum: ['promote', 'demote', 'setrank'], required: true },
    fromRank: { type: String },
    toRank: { type: String, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);
