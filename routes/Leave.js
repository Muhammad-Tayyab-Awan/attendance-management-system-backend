import express from "express";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";
import Leave from "../models/Leave.js";
import { body, query, validationResult } from "express-validator";
import mailTransporter from "../utils/mailTransporter.js";
import User from "../models/Users.js";
import validateFilterQueries from "../utils/validateFilterQueries.js";

const router = express.Router();

router.post(
  "/",
  verifyUserLogin,
  [
    body("startDate", "Invalid start date format").isISO8601({
      strict: true,
      strictSeparator: true
    }),
    body("endDate", "Invalid end date format").isISO8601({
      strict: true,
      strictSeparator: true
    }),
    body("reason", "Reason must be one of: medical, personal, academic, other")
      .isString()
      .isIn(["medical", "personal", "academic", "other"])
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const userId = req.userId;
        let { startDate, endDate, reason } = req.body;
        let today = new Date(
          new Date().toISOString().split("T")[0] + "T00:00:00.000Z"
        );
        endDate = new Date(endDate);
        startDate = new Date(startDate);
        if (startDate < today || endDate < today) {
          return res.status(400).json({
            success: false,
            error:
              "Start Date or End Date should be greater than or equal to today"
          });
        }
        if (startDate > endDate) {
          return res.status(400).json({
            success: false,
            error: "Start Date should be less than End Date"
          });
        }
        await Leave.create({
          userId,
          startDate,
          endDate,
          reason
        });
        const user = await User.findById(userId).select("username");
        const htmlMessage = `
        <div>
          <h1>Dear Admin!</h1>
          <h2>A leave request is pending to approve</h2>
          <h3>Username : ${user.username}</h3>
          <p>Start Date: ${startDate}</p>
          <p>End Date: ${endDate}</p>
          <p>Reason: ${reason}</p>
          <p>Visit your admin panel to approve or reject this leave</p>
        </div>
        `;

        let adminEmails = await User.find({
          role: "admin",
          status: true
        }).select("email");

        if (adminEmails.length > 1) {
          adminEmails = adminEmails.map((admin) => admin.email).join(",");
        }

        adminEmails = adminEmails.map((admin) => admin.email);

        mailTransporter.sendMail(
          {
            to: adminEmails,
            subject: "Leave Request Notification",
            html: htmlMessage
          },
          (err) => {
            if (err) {
              res.status(500).json({
                success: false,
                error: "Error Occurred on Server Side",
                message: err.message
              });
            } else {
              res.status(200).json({
                success: true,
                message: "Leave Request Submitted Successfully"
              });
            }
          }
        );
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
  "/",
  verifyUserLogin,
  [
    query("filter")
      .isString()
      .isIn(["today", "past", "upcoming", "week", "month", "year"])
      .optional(),
    query("status")
      .isString()
      .isIn(["pending", "approved", "rejected"])
      .optional(),
    query("reason")
      .isString()
      .isIn(["medical", "personal", "academic", "other"])
      .optional(),
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
    query("leaveId").isMongoId().optional()
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const userId = req.userId;
        const queries = req.query;
        if (Object.keys(queries).length === 0) {
          const leaves = await Leave.find({ userId: userId })
            .populate("userId", ["email", "_id"], "user")
            .select("-__v");
          return res.status(200).json({ success: true, allLeaves: leaves });
        } else if (
          validateFilterQueries(queries, [
            "filter",
            "reason",
            "status",
            "startDate",
            "endDate",
            "leaveId"
          ])
        ) {
          if (queries.leaveId) {
            const leave = await Leave.findById(queries.leaveId)
              .populate("userId", ["email", "_id"], "user")
              .select("-__v");
            if (leave && leave.userId._id.toString() === userId.toString()) {
              return res.status(200).json({ success: true, leave });
            } else {
              return res.status(400).json({
                success: false,
                error: "Invalid leaveId"
              });
            }
          }
          if (queries.filter) {
            let today =
              new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
            if (queries.filter === "today") {
              queries.startDate = { $lte: today };
              queries.endDate = { $gte: today };
              delete queries.filter;
            } else if (queries.filter === "upcoming") {
              query.startDate = { $gt: today };
              queries.endDate = { $gt: today };
              delete queries.filter;
            } else if (queries.filter === "past") {
              queries.endDate = { $lt: today };
              delete queries.startDate;
              delete queries.filter;
            } else if (queries.filter === "week") {
              let week = new Date();
              week.setDate(week.getDate() - 7);
              week = week.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.startDate = { $gte: week };
              queries.endDate = { $lt: today };
              delete queries.filter;
            } else if (queries.filter === "month") {
              let month = new Date();
              month.setMonth(month.getMonth() - 1);
              month = month.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.startDate = { $gte: month };
              queries.endDate = { $lt: today };
              delete queries.filter;
            } else if (queries.filter === "year") {
              let year = new Date();
              year.setFullYear(year.getFullYear() - 1);
              year = year.toISOString().split("T")[0] + "T00:00:00.000Z";
              queries.startDate = { $gte: year };
              queries.endDate = { $lt: today };
              delete queries.filter;
            }
          }
          const leaves = await Leave.find({
            userId: userId,
            ...queries
          })
            .populate("userId", ["email", "_id"], "user")
            .select("-__v");
          if (leaves.length > 0) {
            res.status(200).json({ success: true, leaves });
          } else {
            res.status(400).json({
              success: false,
              error: "No leaves found"
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
