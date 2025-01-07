import express from "express";
import Attendance from "../models/Attendance.js";
import verifyLogin from "../middlewares/verifyLogin.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.route("/").post(verifyLogin, async (req, res) => {
  try {
    const userId = req.userId;
    const date = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({
      userId: userId,
      date: date
    });
    if (attendance) {
      res
        .status(400)
        .json({ success: false, error: "Attendance already marked" });
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
});

export default router;
