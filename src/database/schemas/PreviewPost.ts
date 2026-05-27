import mongoose, { Document, Schema } from 'mongoose';

export interface IPreviewPost extends Document {
  guildId: string;
  authorId: string;
  authorTag: string;
  title: string;
  description: string;
  imageUrl?: string;
  channelId: string;
  messageId?: string;
  scheduledAt?: Date;
  posted: boolean;
  createdAt: Date;
}

const PreviewPostSchema = new Schema<IPreviewPost>(
  {
    guildId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorTag: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    channelId: { type: String, required: true },
    messageId: { type: String },
    scheduledAt: { type: Date },
    posted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PreviewPost = mongoose.model<IPreviewPost>('PreviewPost', PreviewPostSchema);
