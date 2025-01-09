import cron from "node-cron";
import Leave from "../models/Leave.js";
import mailTransporter from "../utils/mailTransporter.js";

const leavesCronHour = process.env.LEAVES_CRON_HOUR;
const leavesCronMin = process.env.LEAVES_CRON_MIN;

const startLeavesAutoRejectionCronJob = () => {
  try {
    cron.schedule(
      `${leavesCronMin} ${leavesCronHour} * * *`,
      async () => {
        try {
          let usersEmail = await Leave.find({
            status: "pending"
          }).populate("userId", "email", "user");
          await Leave.updateMany(
            { status: "pending" },
            {
              $set: { status: "rejected" }
            }
          );
          if (usersEmail.length > 0) {
            if (usersEmail.length > 1) {
              usersEmail = usersEmail
                .map((leave) => leave.userId.email)
                .join(",");
            } else {
              usersEmail = usersEmail.map((leave) => leave.userId.email);
            }
            const htmlMessage = `
            <h1>Leave Rejection</h1>
            <div>
            <h2>Dear User!</h2>
            <h3>Your leave request has been rejected automatically due to admins unavailability</h3>
            </div>
            `;
            mailTransporter.sendMail(
              {
                to: usersEmail,
                subject: "Automatic Leave Rejection",
                html: htmlMessage
              },
              (err) => {
                if (err) {
                  console.error("Error sending email:", err);
                } else {
                  console.log({
                    success: true,
                    msg: "Leaves rejected successfully"
                  });
                }
              }
            );
          } else {
            console.log({ success: true, msg: "No pending leaves" });
          }
        } catch (err) {
          console.error("Error in Leaves Auto Rejection Cron Job:", err);
        }
      },
      { scheduled: true, timezone: "Asia/Karachi" }
    );
    console.log({
      success: true,
      msg: "Leaves Auto Rejection Cron Job Scheduled Successfully"
    });
  } catch (error) {
    console.error(
      "Failed to schedule Leaves Auto Rejection Cron Job :",
      error.message
    );
  }
};

export default startLeavesAutoRejectionCronJob;
