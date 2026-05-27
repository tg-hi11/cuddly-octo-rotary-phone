import mongoose, { Document, Schema } from 'mongoose';

export interface IGuildConfig extends Document {
  guildId: string;
  prefix: string;
  sessionChannel: string;
  previewChannel: string;
  promoChannel: string;
  infractionChannel: string;
  sessionPermsRole: string;
  infractionPermsRole: string;
  promotionPermsRole: string;
  voteThreshold: number;
  rankHierarchy: { name: string; roleId: string; level: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const GuildConfigSchema = new Schema<IGuildConfig>(
  {
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '>' },
    sessionChannel: { type: String, default: '' },
    previewChannel: { type: String, default: '' },
    promoChannel: { type: String, default: '' },
    infractionChannel: { type: String, default: '' },
    sessionPermsRole: { type: String, default: '' },
    infractionPermsRole: { type: String, default: '' },
    promotionPermsRole: { type: String, default: '' },
    voteThreshold: { type: Number, default: 5 },
    rankHierarchy: [
      {
        name: { type: String },
        roleId: { type: String },
        level: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

export const GuildConfig = mongoose.model<IGuildConfig>('GuildConfig', GuildConfigSchema);
