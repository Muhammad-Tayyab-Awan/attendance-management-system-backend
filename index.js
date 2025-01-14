import cors from "cors";
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import favicon from "serve-favicon";
import path from "path";
import { fileURLToPath } from "url";
import connectToDatabase from "./utils/dbConnection.js";
import startAbsenceCronJob from "./utils/absenceCron.js";
import startLeavesApprovalNotificationCronJob from "./utils/leavesApprovalNotificationCron.js";
import startLeavesAutoRejectionCronJob from "./utils/leavesAutoRejectionCron.js";
import userRouter from "./routes/User.js";
import attendanceRoute from "./routes/Attendance.js";
import leaveRoute from "./routes/Leave.js";
import gradeRoute from "./routes/Grade.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(favicon(path.join(__dirname, "favicon.ico")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS);

const corsOption = {
  origin: allowedOrigins,
  credentials: true,
  optionSuccessStatus: 200
};

app.use(cors(corsOption));

app.use("/api/user", userRouter);
app.use("/api/attendance", attendanceRoute);
app.use("/api/leave", leaveRoute);
app.use("/api/grade", gradeRoute);

app.get("/", (req, res) => {
  res.send({
    success: true,
    msg: "Welcome to Attendance Management System"
  });
});

app.all("*", (req, res) => {
  res.status(404).json({ success: false, msg: `Requested Service Not Found` });
});

app.listen(PORT, () => {
  console.clear();
  connectToDatabase()
    .then((res) => {
      console.log(res);
      startAbsenceCronJob();
      startLeavesApprovalNotificationCronJob();
      startLeavesAutoRejectionCronJob();
    })
    .catch(() => {
      console.log({ success: false, msg: "Connection Error Occurred" });
    });
  console.log({
    success: true,
    msg: `App running on http://localhost:${PORT}`
  });
});
