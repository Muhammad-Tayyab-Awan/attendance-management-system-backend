import cron from "node-cron";
import User from "../models/Users.js";
import Leave from "../models/Leave.js";
import mailTransporter from "./mailTransporter.js";

const notificationCronHour = process.env.NOTIFICATION_CRON_HOUR;
const notificationCronMin = process.env.NOTIFICATION_CRON_MIN;

const startLeavesApprovalNotificationCronJob = () => {
  try {
    cron.schedule(
      `${notificationCronMin} ${notificationCronHour} * * *`,
      async () => {
        try {
          const pendingLeaves = await Leave.find({
            status: "pending"
          });
          if (pendingLeaves.length > 0) {
            let adminEmails = await User.find({
              role: "admin",
              status: true,
              verified: true
            }).select("email");
            if (adminEmails.length > 1) {
              adminEmails = adminEmails.map((admin) => admin.email).join(",");
            }
            adminEmails = adminEmails.map((admin) => admin.email);
            const htmlMessage = `
              <p>Dear Admin,</p>
              <p>This is a reminder that there are ${pendingLeaves.length} pending leaves for approval. Please take necessary actions to approve or reject the leaves.</p>
              <p>Thank you.</p>
            `;
            mailTransporter.sendMail(
              {
                to: adminEmails,
                subject: "Pending Leaves Approval Remainder",
                html: htmlMessage
              },
              (err) => {
                if (err) {
                  console.error("Error sending email:", err);
                } else {
                  console.log({
                    success: true,
                    msg: "Leaves Approval Notification Sent Successfully"
                  });
                }
              }
            );
          } else {
            console.log({ success: true, msg: "No pending leaves found" });
          }
        } catch (err) {
          console.error("Error in Leaves Approval Notification Cron Job:", err);
        }
      },
      { scheduled: true, timezone: "Asia/Karachi" }
    );
    console.log({
      success: true,
      msg: "Leaves Approval Notification Cron Job Scheduled Successfully"
    });
  } catch (error) {
    console.error(
      "Failed to schedule Leaves Approval Notification Cron Job:",
      error.message
    );
  }
};
export default startLeavesApprovalNotificationCronJob;
