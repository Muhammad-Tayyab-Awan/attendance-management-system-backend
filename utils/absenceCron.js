import cron from "node-cron";
import User from "../models/Users.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

const absenceCronHour = process.env.ABSENCE_CRON_HOUR;
const absenceCronMin = process.env.ABSENCE_CRON_MIN;

const startAbsenceCronJob = () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    cron.schedule(
      `${absenceCronMin} ${absenceCronHour} * * *`,
      async () => {
        try {
          let attendedUsers = await Attendance.find({ date: today }).distinct(
            "userId"
          );

          let usersWithLeave = await Leave.find({
            $or: [{ status: "pending" }, { status: "approved" }],
            startDate: { $lte: today },
            endDate: { $gte: today }
          }).distinct("userId");

          usersWithLeave = usersWithLeave.map((userId) => userId.toString());

          const users = await User.find({ status: true, role: "user" }).select(
            "_id"
          );

          attendedUsers = attendedUsers.map((userId) => userId.toString());

          const absentUsers = users
            .map((user) => user._id.toString())
            .filter((userId) => !attendedUsers.includes(userId))
            .filter((userId) => !usersWithLeave.includes(userId));

          if (absentUsers.length > 0) {
            absentUsers.forEach(async (userId) => {
              await Attendance.create({
                userId: userId,
                status: "absent"
              });
            });
            console.log({
              success: true,
              msg: `Marked ${absentUsers.length} users as absent`
            });
          } else {
            console.log({ success: true, msg: "No absences to record today" });
          }
        } catch (err) {
          console.error("Error in Absence Cron Job:", err);
        }
      },
      { scheduled: true, timezone: "Asia/Karachi" }
    );
    console.log({
      success: true,
      msg: "Absence Cron Job Scheduled Successfully"
    });
  } catch (error) {
    console.error("Failed to schedule Absence Cron Job:", error.message);
  }
};
export default startAbsenceCronJob;
