import express from "express";
import Attendance from "../models/Attendance.js";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";
import Leave from "../models/Leave.js";

const router = express.Router();

router
  .route("/")
  .post(verifyUserLogin, async (req, res) => {
    try {
      const userId = req.userId;
      const date = new Date().toISOString().split("T")[0];
      const attendance = await Attendance.findOne({
        userId: userId,
        date: date
      });
      const today = new Date().toISOString().split("T")[0];
      let todayLeave = await Leave.find({
        userId: userId,
        $or: [{ status: "pending" }, { status: "approved" }],
        startDate: { $lte: today },
        endDate: { $gte: today }
      }).distinct("userId");

      if (attendance) {
        res
          .status(400)
          .json({ success: false, error: "Attendance already marked" });
      } else if (todayLeave.length > 0) {
        res.status(400).json({
          success: false,
          error: "You are on leave, attendance cannot be marked"
        });
      } else {
        const todayStartTime = new Date().setHours(7, 0, 0, 0);
        const currentTime = Date.now();
        if (currentTime <= todayStartTime) {
          await Attendance.create({
            userId: userId,
            status: "present"
          });
          res.status({
            success: true,
            msg: `Your present is marked successfully`
          });
        } else {
          res.status(400).json({
            success: false,
            error: "Attendance cannot be marked after 7 AM"
          });
        }
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  })
  .get(verifyUserLogin, async (req, res) => {
    try {
      const userId = req.userId;
      const date = new Date().toISOString().split("T")[0];
      const attendance = await Attendance.findOne({
        userId: userId,
        date: date
      });
      if (attendance) {
        res.status(200).json({
          success: true,
          attendance: attendance
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Attendance is not marked yet"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  });

export default router;
