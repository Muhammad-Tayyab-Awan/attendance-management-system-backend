import express from "express";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";
import Leave from "../models/Leave.js";
import { body, validationResult } from "express-validator";
import mailTransporter from "../utils/mailTransporter.js";
import User from "../models/Users.js";

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
        const date = new Date();
        const today = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0,
          0,
          0,
          0
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

export default router;
