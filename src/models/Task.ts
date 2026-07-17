import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  reward: number;
  taskType: string;
  chatId?: string;
  targetUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
    },
    taskType: {
      type: String,
      required: true,
    },
    chatId: {
      type: String,
    },
    targetUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>('Task', TaskSchema);
