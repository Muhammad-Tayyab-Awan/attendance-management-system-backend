import express from "express";
import Grade from "../models/Grade.js";
import Attendance from "../models/Attendance.js";
import verifyUserLogin from "../middlewares/verifyUserLogin.js";
import verifyAdminLogin from "../middlewares/verifyAdminLogin.js";
import validateFilterQueries from "../utils/validateFilterQueries.js";
import { query, validationResult } from "express-validator";
import User from "../models/Users.js";

const router = express.Router();

router.get("/", verifyUserLogin, async (req, res) => {
  try {
    const userId = req.userId;
    const grades = await Grade.findOne({ userId: userId });
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
      if (grades.totalDays !== 0) {
        grades.percentage = (grades.totalPresents / grades.totalDays) * 100;
      }
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
      let percentage = 0;
      if (totalDays !== 0) {
        percentage = (totalPresents / totalDays) * 100;
      }
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

router.get(
  "/all",
  verifyAdminLogin,
  query("userId").isMongoId().optional(),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const queries = req.query;
        if (Object.keys(queries).length === 0) {
          let users = await User.find({
            role: "user",
            status: true,
            verified: true
          }).select("_id");
          if (users.length > 1) {
            const userGrades = [];
            users = users.map((user) => user._id);
            for (let user of users) {
              const grades = await Grade.findOne({ userId: user });
              if (grades) {
                grades.totalDays = (
                  await Attendance.find({ userId: user })
                ).length;
                grades.totalLeaves = (
                  await Attendance.find({ userId: user, status: "leave" })
                ).length;
                grades.totalPresents = (
                  await Attendance.find({ userId: user, status: "present" })
                ).length;
                grades.totalAbsents = (
                  await Attendance.find({ userId: user, status: "absent" })
                ).length;
                if (grades.totalDays !== 0) {
                  grades.percentage =
                    (grades.totalPresents / grades.totalDays) * 100;
                }
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
                userGrades.push(grades);
              } else {
                const totalDays = (await Attendance.find({ userId: user }))
                  .length;
                const totalLeaves = (
                  await Attendance.find({ userId: user, status: "leave" })
                ).length;
                const totalPresents = (
                  await Attendance.find({ userId: user, status: "present" })
                ).length;
                const totalAbsents = (
                  await Attendance.find({ userId: user, status: "absent" })
                ).length;
                let percentage = 0;
                if (totalDays !== 0) {
                  percentage = (totalPresents / totalDays) * 100;
                }
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
                  userId: user,
                  totalDays,
                  totalLeaves,
                  totalPresents,
                  totalAbsents,
                  percentage,
                  grade
                });
                userGrades.push(newGrades);
              }
            }
            res.status(200).json({ success: true, userGrades });
          } else if (users.length === 1) {
            users = users.map((user) => user._id);
            users = users[0];
            const grades = await Grade.findOne({ userId: users });
            if (grades) {
              grades.totalDays = (
                await Attendance.find({ userId: users })
              ).length;
              grades.totalLeaves = (
                await Attendance.find({ userId: users, status: "leave" })
              ).length;
              grades.totalPresents = (
                await Attendance.find({ userId: users, status: "present" })
              ).length;
              grades.totalAbsents = (
                await Attendance.find({ userId: users, status: "absent" })
              ).length;
              if (grades.totalDays !== 0) {
                grades.percentage =
                  (grades.totalPresents / grades.totalDays) * 100;
              }
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
              const totalDays = (await Attendance.find({ userId: users }))
                .length;
              const totalLeaves = (
                await Attendance.find({ userId: users, status: "leave" })
              ).length;
              const totalPresents = (
                await Attendance.find({ userId: users, status: "present" })
              ).length;
              const totalAbsents = (
                await Attendance.find({ userId: users, status: "absent" })
              ).length;
              let percentage = 0;
              if (totalDays !== 0) {
                percentage = (totalPresents / totalDays) * 100;
              }
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
                userId: users,
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
          } else {
            res.status(400).json({ success: false, error: "No users found" });
          }
        } else if (validateFilterQueries(queries, ["userId"])) {
          const userId = queries.userId;
          const user = await User.findById(userId);
          if (!user) {
            return res
              .status(400)
              .json({ success: false, error: "User not found" });
          }
          if (user.status && user.verified && user.role === "user") {
            const grades = await Grade.findOne({ userId: userId });
            if (grades) {
              grades.totalDays = (
                await Attendance.find({ userId: userId })
              ).length;
              grades.totalLeaves = (
                await Attendance.find({ userId: userId, status: "leave" })
              ).length;
              grades.totalPresents = (
                await Attendance.find({ userId: userId, status: "present" })
              ).length;
              grades.totalAbsents = (
                await Attendance.find({ userId: userId, status: "absent" })
              ).length;
              if (grades.totalDays !== 0) {
                grades.percentage =
                  (grades.totalPresents / grades.totalDays) * 100;
              }
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
              const totalDays = (await Attendance.find({ userId: userId }))
                .length;
              const totalLeaves = (
                await Attendance.find({ userId: userId, status: "leave" })
              ).length;
              const totalPresents = (
                await Attendance.find({ userId: userId, status: "present" })
              ).length;
              const totalAbsents = (
                await Attendance.find({ userId: userId, status: "absent" })
              ).length;
              let percentage = 0;
              if (totalDays !== 0) {
                percentage = (totalPresents / totalDays) * 100;
              }
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
          } else {
            res.status(400).json({
              success: false,
              error: "User not found"
            });
          }
        } else {
          res
            .status(400)
            .json({ success: false, error: "Invalid query parameters" });
        }
      } else {
        res.status(400).json({
          success: false,
          error: result.errors
        });
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
