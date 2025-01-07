import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: Date
  },
  status: {
    type: String,
    enum: ["present", "leave", "absent"],
    required: true
  },
  remarks: {
    type: String,
    enum: ["onTime", "late"]
  },
  markedDate: {
    type: Date,
    default: Date.now
  }
});

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

attendanceSchema.pre("save", function (next) {
  if (!this.date) {
    const date = new Date();
    this.date = date.toISOString().split("T")[0];
  }
  next();
});

const Attendance = mongoose.model("attendance", attendanceSchema);

export default Attendance;
