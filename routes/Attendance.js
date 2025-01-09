import express from "express";
import Attendance from "../models/Attendance.js";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";
import verifyAdminLogin from "../middlewares/verifyAdminLogin.js";
import Leave from "../models/Leave.js";
import { query, validationResult } from "express-validator";
import validateFilterQueries from "../utils/validateFilterQueries.js";

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

router.get(
  "/all",
  verifyUserLogin,
  [
    query("filter").isString().isIn(["week", "month", "year"]).optional(),
    query("status").isString().isIn(["absent", "present", "leave"]).optional(),
    query("startDate")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    query("endDate")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    query("attendanceId").isMongoId().optional()
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const userId = req.userId;
        const queries = req.query;
        if (Object.keys(req.query).length === 0) {
          const attendances = await Attendance.find({ userId: userId });
          res.status(200).json({
            success: true,
            attendances: attendances
          });
        } else if (
          validateFilterQueries(queries, [
            "filter",
            "status",
            "startDate",
            "endDate",
            "attendanceId"
          ])
        ) {
          if (queries.attendanceId) {
            const attendance = await Attendance.findById(queries.attendanceId);
            if (
              attendance &&
              attendance.userId.toString() === userId.toString()
            ) {
              return res.status(200).json({
                success: true,
                attendance: attendance
              });
            } else {
              return res.status(400).json({
                success: false,
                error: "Attendance not found"
              });
            }
          }
          if (queries.filter) {
            const today =
              new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
            if (queries.filter === "week") {
              let week = new Date();
              week.setDate(week.getDate() - 7);
              week = week.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: week,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            } else if (queries.filter === "month") {
              let month = new Date();
              month.setMonth(month.getMonth() - 1);
              month = month.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: month,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            } else {
              let year = new Date();
              year.setFullYear(year.getFullYear() - 1);
              year = year.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: year,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            }
            delete queries.filter;
          }
          if (queries.startDate || queries.endDate) {
            if (queries.startDate && queries.endDate) {
              queries.startDate =
                new Date(queries.startDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.endDate =
                new Date(queries.endDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $gte: queries.startDate,
                $lte: queries.endDate
              };
            }
            if (queries.startDate) {
              queries.startDate =
                new Date(queries.startDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $gte: queries.startDate
              };
            }
            if (queries.endDate) {
              queries.endDate =
                new Date(queries.endDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $lte: queries.endDate
              };
            }
            delete queries.startDate;
            delete queries.endDate;
          }
          const attendances = await Attendance.find({
            userId: userId,
            ...queries
          });
          if (attendances.length > 0) {
            res.status(200).json({
              success: true,
              attendances: attendances
            });
          } else {
            res.status(400).json({
              success: false,
              error: "No attendance record found according to your search"
            });
          }
        } else {
          res.status(400).json({
            success: false,
            error: "Invalid Query Parameters"
          });
        }
      } else {
        res.status(400).json({ success: false, error: result.errors });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  }
);

router.get(
  "/all-admin",
  verifyAdminLogin,
  [
    query("filter").isString().isIn(["week", "month", "year"]).optional(),
    query("status").isString().isIn(["absent", "present", "leave"]).optional(),
    query("startDate")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    query("endDate")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    query("attendanceId").isMongoId().optional(),
    query("userId").isMongoId().optional()
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const queries = req.query;
        if (Object.keys(req.query).length === 0) {
          const attendances = await Attendance.find();
          res.status(200).json({
            success: true,
            attendances: attendances
          });
        } else if (
          validateFilterQueries(queries, [
            "filter",
            "status",
            "startDate",
            "endDate",
            "attendanceId",
            "userId"
          ])
        ) {
          if (queries.attendanceId) {
            const attendance = await Attendance.findById(queries.attendanceId);
            if (attendance) {
              return res.status(200).json({
                success: true,
                attendance: attendance
              });
            } else {
              return res.status(400).json({
                success: false,
                error: "Attendance not found"
              });
            }
          }
          if (queries.filter) {
            const today =
              new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
            if (queries.filter === "week") {
              let week = new Date();
              week.setDate(week.getDate() - 7);
              week = week.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: week,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            } else if (queries.filter === "month") {
              let month = new Date();
              month.setMonth(month.getMonth() - 1);
              month = month.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: month,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            } else {
              let year = new Date();
              year.setFullYear(year.getFullYear() - 1);
              year = year.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.date = {
                $gte: year,
                $lt: today
              };
              delete queries.startDate;
              delete queries.endDate;
            }
            delete queries.filter;
          }
          if (queries.startDate || queries.endDate) {
            if (queries.startDate && queries.endDate) {
              queries.startDate =
                new Date(queries.startDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.endDate =
                new Date(queries.endDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $gte: queries.startDate,
                $lte: queries.endDate
              };
            }
            if (queries.startDate) {
              queries.startDate =
                new Date(queries.startDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $gte: queries.startDate
              };
            }
            if (queries.endDate) {
              queries.endDate =
                new Date(queries.endDate).toISOString().split("T")[0] +
                "T00:00:00.000Z";
              queries.date = {
                $lte: queries.endDate
              };
            }
            delete queries.startDate;
            delete queries.endDate;
          }
          const attendances = await Attendance.find({
            ...queries
          });
          if (attendances.length > 0) {
            res.status(200).json({
              success: true,
              attendances: attendances
            });
          } else {
            res.status(400).json({
              success: false,
              error: "No attendance record found according to your search"
            });
          }
        } else {
          res.status(400).json({
            success: false,
            error: "Invalid Query Parameters"
          });
        }
      } else {
        res.status(400).json({ success: false, error: result.errors });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  }
);

export default router;
