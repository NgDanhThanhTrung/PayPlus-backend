import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskCompletion extends Document {
  telegramId: number;
  taskId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TaskCompletionSchema: Schema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TaskCompletionSchema.index({ telegramId: 1, taskId: 1 }, { unique: true });

export default mongoose.model<ITaskCompletion>('TaskCompletion', TaskCompletionSchema);
