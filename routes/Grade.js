import express from "express";
import Grade from "../models/Grade.js";
import Attendance from "../models/Attendance.js";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";

const router = express.Router();

router.get("/", verifyUserLogin, async (req, res) => {
  try {
    const userId = req.userId;
    const grades = await Grade.findOne({ userId });
    if (grades) {
      grades.totalDays = (await Attendance.find({ userId })).length;
      grades.totalLeaves = (
        await Attendance.find({ userId, status: "leave" })
      ).length;
      grades.totalPresents = (
        await Attendance.find({ userId, status: "present" })
      ).length;
      grades.totalAbsents = (
        await Attendance.find({ userId, status: "absent" })
      ).length;
      grades.percentage = (grades.totalPresents / grades.totalDays) * 100;
      if (grades.percentage >= 90) {
        grades.grade = "A";
      } else if (grades.percentage >= 80) {
        grades.grade = "B";
      } else if (grades.percentage >= 70) {
        grades.grade = "C";
      } else if (grades.percentage >= 60) {
        grades.grade = "D";
      } else if (grades.percentage >= 50) {
        grades.grade = "E";
      } else {
        grades.grade = "F";
      }
      await grades.save();
      res.status(200).json({
        success: true,
        grades
      });
    } else {
      const totalDays = (await Attendance.find({ userId })).length;
      const totalLeaves = (await Attendance.find({ userId, status: "leave" }))
        .length;
      const totalPresents = (
        await Attendance.find({ userId, status: "present" })
      ).length;
      const totalAbsents = (await Attendance.find({ userId, status: "absent" }))
        .length;
      const percentage = (totalPresents / totalDays) * 100;
      let grade;
      if (percentage >= 90) {
        grade = "A";
      } else if (percentage >= 80) {
        grade = "B";
      } else if (percentage >= 70) {
        grade = "C";
      } else if (percentage >= 60) {
        grade = "D";
      } else if (percentage >= 50) {
        grade = "E";
      } else {
        grade = "F";
      }
      const newGrades = await Grade.create({
        userId,
        totalDays,
        totalLeaves,
        totalPresents,
        totalAbsents,
        percentage,
        grade
      });
      res.status(200).json({
        success: true,
        grades: newGrades
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
