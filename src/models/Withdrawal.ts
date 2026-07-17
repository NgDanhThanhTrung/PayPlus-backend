import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  telegramId: number;
  paymentMethod: string;
  goldAmount: number;
  realAmount: number;
  currency: string;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema: Schema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    goldAmount: {
      type: Number,
      required: true,
    },
    realAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
