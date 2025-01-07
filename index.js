import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import connectToDatabase from "./utils/dbConnection.js";
import startAbsenceCronJob from "./utils/absenceCron.js";
import userRouter from "./routes/User.js";
import attendanceRoute from "./routes/Attendance.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/user", userRouter);
app.use("/api/attendance", attendanceRoute);

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
    })
    .catch(() => {
      console.log({ success: false, msg: "Connection Error Occurred" });
    });
  console.log({
    success: true,
    msg: `App running on http://localhost:${PORT}`
  });
});
