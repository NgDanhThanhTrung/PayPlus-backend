import mongoose, { Schema, Document } from 'mongoose';

export interface IAdView extends Document {
  telegramId: number;
  reward: number;
  createdAt: Date;
}

const AdViewSchema: Schema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    reward: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

AdViewSchema.index({ telegramId: 1, createdAt: 1 });

export default mongoose.model<IAdView>('AdView', AdViewSchema);
