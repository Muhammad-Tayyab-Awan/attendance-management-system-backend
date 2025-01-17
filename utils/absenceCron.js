import cron from "node-cron";
import User from "../models/Users.js";
import Attendance from "../models/Attendance.js";

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
          let attendedUsers = await Attendance.find({ date: todayISO });
          let allUsers = await User.find({
            role: "user",
            status: true,
            verified: true
          });
          attendedUsers = attendedUsers.map((user) => user.userId.toString());
          allUsers = allUsers.map((user) => user._id.toString());
          const absentUsers = allUsers.filter(
            (user) => !attendedUsers.includes(user)
          );
          if (absentUsers.length > 0) {
            for (let absentUser of absentUsers) {
              await Attendance.create({
                userId: absentUser,
                status: "absent",
                date: todayISO
              });
            }
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
