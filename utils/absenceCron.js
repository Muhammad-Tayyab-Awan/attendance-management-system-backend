import cron from "node-cron";
import User from "../models/Users.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

const absenceCronHour = process.env.ABSENCE_CRON_HOUR;
const absenceCronMin = process.env.ABSENCE_CRON_MIN;

const startAbsenceCronJob = () => {
  try {
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];

    cron.schedule(
      `${absenceCronMin} ${absenceCronHour} * * *`,
      async () => {
        try {
          const [attendedUsers, allUsers] = await Promise.all([
            Attendance.find({ date: todayISO }),
            User.find({ status: true, role: "user" }).select("-password")
          ]);
          const absentUsers = allUsers
            .map((user) => user._id.toString())
            .filter(
              (userId) =>
                !attendedUsers
                  .map((user) => user.userId.toString())
                  .includes(userId)
            );
          const newDate = new Date().toISOString().split("T")[0];
          if (absentUsers.length > 0) {
            await Promise.all(
              absentUsers.map((userId) =>
                Attendance.create({ userId, status: "absent", date: newDate })
              )
            );
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
