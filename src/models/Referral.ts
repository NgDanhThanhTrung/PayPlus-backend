import mongoose, { Schema, Document } from 'mongoose';

export interface IReferral extends Document {
  inviterId: number;
  inviteeId: number;
  status: 'pending' | 'active';
  adCount: number;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema: Schema = new Schema(
  {
    inviterId: {
      type: Number,
      required: true,
      index: true,
    },
    inviteeId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },
    adCount: {
      type: Number,
      default: 0,
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IReferral>('Referral', ReferralSchema);
