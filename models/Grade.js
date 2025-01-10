import mongoose, { Schema } from "mongoose";

const gradeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true
    },
    totalDays: {
      type: Number,
      required: true
    },
    totalPresents: {
      type: Number,
      required: true
    },
    totalAbsents: {
      type: Number,
      required: true
    },
    totalLeaves: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    grade: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D", "E", "F"]
    }
  },
  { timestamps: true }
);

const Grade = mongoose.model("grade", gradeSchema);
export default Grade;
