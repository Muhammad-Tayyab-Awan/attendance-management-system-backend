import express from "express";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import {
  body,
  cookie,
  param,
  query,
  validationResult
} from "express-validator";
import jwt from "jsonwebtoken";
import mailTransporter from "../utils/mailTransporter.js";
import verifyLogin from "../middlewares/verifyLogin.js";
import verifyAdminLogin from "../middlewares/verifyAdminLogin.js";
import validateFilterQueries from "../utils/validateFilterQueries.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import Grade from "../models/Grade.js";
import upload from "../middlewares/multerConfig.js";
import cloudinary from "../utils/cloudinaryConfig.js";

const JWT_SECRET = process.env.JWT_SECRET;
const API_URI = process.env.API_URI;
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER;

const router = express.Router();

router
  .route("/")
  .post(
    [
      body(
        "username",
        "Username must consist of 6 to 18 chars (lowercase and numbers only)"
      )
        .isString()
        .matches(/^[a-z0-9]{6,18}$/),
      body("email", "Enter a valid email").isEmail(),
      body(
        "password",
        "Password must contain at least 8 chars and must consist of min 2 uppercase, lowercase, numbers and symbols"
      ).isStrongPassword({
        minLength: 8,
        minLowercase: 2,
        minUppercase: 2,
        minNumbers: 2,
        minSymbols: 2
      }),
      body("firstName").matches(/^[A-Z][a-z]{3,20}$/),
      body("lastName").matches(/^[A-Z][a-z]{3,30}$/),
      body("role").isString().isIn(["admin", "user"]),
      body("gender").isString().isIn(["male", "female"]),
      body("address")
        .isString()
        .matches(/^[a-zA-Z0-9\s,.\-]{10,70}$/),
      cookie("admin-auth-token").isJWT().optional()
    ],
    async (req, res) => {
      try {
        const result = validationResult(req);
        if (result.isEmpty()) {
          if (req.cookies["admin-auth-token"]) {
            const token = req.cookies["admin-auth-token"];
            jwt.verify(token, JWT_SECRET, async (err, decodedToken) => {
              if (err) {
                res
                  .status(401)
                  .json({ success: false, error: "Invalid request" });
              } else {
                const user = await User.findById(decodedToken.userId);
                if (
                  user &&
                  user.role === "admin" &&
                  user.verified === true &&
                  user.status === true
                ) {
                  const { password } = req.body;
                  const salt = await bcrypt.genSalt(10);
                  const hashedPassword = await bcrypt.hash(password, salt);
                  req.body.password = hashedPassword;
                  req.body.verified = true;
                  User.create(req.body)
                    .then(async (user) => {
                      const verificationToken = jwt.sign(
                        { userId: user.id },
                        JWT_SECRET
                      );
                      const htmlMessage = `<h2>Dear ${user.firstName} ${user.lastName}! Please verify your email by visiting the link below</h2><a href="${API_URI}/api/user/verify-email/${verificationToken}">Verify Now</a>`;
                      mailTransporter.sendMail(
                        {
                          to: user.email,
                          subject: "User Email Verification",
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
                            res.status(201).json({
                              success: true,
                              msg: `User Registration Successful. We have sent verification email to ${user.email}`
                            });
                          }
                        }
                      );
                    })
                    .catch(() => {
                      res.status(400).json({
                        success: false,
                        error:
                          "Error occurred while registering new user account"
                      });
                    });
                } else {
                  res.status(401).json({
                    success: false,
                    error: "Invalid request"
                  });
                }
              }
            });
          } else if (req.body.role === "admin") {
            res.status(401).json({
              success: false,
              error: "Invalid request"
            });
          } else {
            const { password } = req.body;
            const passwordCopy = password;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            req.body.password = hashedPassword;
            req.body.verified = false;
            User.create(req.body)
              .then(async (user) => {
                const verificationToken = jwt.sign(
                  { userId: user.id },
                  JWT_SECRET
                );
                const htmlMessage = `
                <div>
                <h2>Dear ${user.firstName} ${user.lastName}! Please verify your email by visiting the link below</h2><a href="${API_URI}/api/user/verify-email/${verificationToken}">Verify Now</a>
                </div>
                <div>
                <h2>Your Login Credentials</h2>
                <p>Email : ${user.email}</p>
                <p>Password : ${passwordCopy}</p>
                <p>Keep this credentials safe and do not share with anyone</p>
                </div>
                `;

                let adminEmails = await User.find({
                  role: "admin",
                  status: true,
                  verified: true
                }).select("email");

                if (adminEmails.length > 1) {
                  adminEmails = adminEmails
                    .map((admin) => admin.email)
                    .join(",");
                }

                adminEmails = adminEmails.map((admin) => admin.email);

                const adminMessage = `<h2>Dear ${user.firstName} ${user.lastName}! A new user account has been created. Please verify the account by visiting the link below</h2><a href="${API_URI}/api/user/verify-user/${verificationToken}">Verify Now</a>`;
                mailTransporter.sendMail(
                  {
                    to: adminEmails,
                    subject: "New User Verification",
                    html: adminMessage
                  },
                  (err) => {
                    if (err) {
                      res.status(500).json({
                        success: false,
                        error: "Error Occurred on Server Side",
                        message: err.message
                      });
                    } else {
                      mailTransporter.sendMail(
                        {
                          to: user.email,
                          subject: "User Email Verification",
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
                            res.status(201).json({
                              success: true,
                              msg: `User Registration Successful. We have sent an email to ${user.email}, please visit your mailbox to verify your account`
                            });
                          }
                        }
                      );
                    }
                  }
                );
              })
              .catch(() => {
                res.status(400).json({
                  success: false,
                  error: "Error occurred while registering your account"
                });
              });
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
  )
  .get(verifyLogin, async (req, res) => {
    try {
      const userId = req.userId || req.adminId;
      const user = await User.findById(userId).select([
        "-_id",
        "-password",
        "-status",
        "-__v"
      ]);
      res.status(200).json({
        success: true,
        user: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  })
  .delete(verifyLogin, async (req, res) => {
    try {
      const userId = req.userId || req.adminId;
      if (req.adminId) {
        const allAdmins = await User.find({
          role: "admin",
          status: true,
          verified: true
        });
        if (allAdmins.length === 1) {
          return res.status(400).json({
            success: false,
            error:
              "You are the only admin if you want to delete your account add another admin first"
          });
        }
      }
      await Grade.deleteMany({ userId: userId });
      await Leave.deleteMany({ userId: userId });
      await Attendance.deleteMany({ userId: userId });
      const public_id = `${cloudinaryFolder}/${userId.toString()}`;
      await cloudinary.uploader.destroy(public_id);
      const user = await User.findByIdAndDelete(userId);
      res.clearCookie("admin-auth-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
      });
      res.clearCookie("user-auth-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
      });
      res.status(200).json({
        success: true,
        msg: `Dear ${user.username}! Your account is deleted successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error Occurred on Server Side",
        message: error.message
      });
    }
  })
  .put(
    verifyLogin,
    [
      body(
        "username",
        "Username must consist of 6 to 18 chars (lowercase and numbers only)"
      )
        .isString()
        .matches(/^[a-z0-9]{6,18}$/)
        .optional(),
      body("email", "Enter a valid email").isEmail().optional(),
      body("firstName")
        .matches(/^[A-Z][a-z]{3,20}$/)
        .optional(),
      body("lastName")
        .matches(/^[A-Z][a-z]{3,30}$/)
        .optional(),
      body("gender").isString().isIn(["male", "female"]).optional(),
      body("address")
        .isString()
        .matches(/^[a-zA-Z0-9\s,.\-]{10,70}$/)
        .optional()
    ],
    async (req, res) => {
      try {
        const result = validationResult(req);
        if (result.isEmpty()) {
          const userId = req.adminId || req.userId;
          const user = await User.findById(userId);
          const updatedData = req.body;
          if (updatedData.email) {
            updatedData.status =
              updatedData.email === user.email ? true : false;
          }
          const updatedUser = await User.findByIdAndUpdate(
            userId,
            updatedData,
            { new: true }
          ).select(["-password", "-status", "-__v"]);
          if (updatedData.email && updatedData.email !== user.email) {
            const verificationToken = jwt.sign({ userId: user.id }, JWT_SECRET);
            const htmlMessage = `<h2>Dear ${updatedUser.firstName} ${updatedUser.lastName}! Please verify your email by visiting the link below</h2><a href="${API_URI}/api/user/verify-email/${verificationToken}">Verify Now</a>`;
            mailTransporter.sendMail(
              {
                to: updatedData.email,
                subject: "User Email Verification",
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
                    msg: `Dear ${updatedUser.username}! Your account is updated successfully. We have sent an email to ${updatedUser.email}, please visit your mailbox to verify your account`
                  });
                }
              }
            );
          } else {
            res.status(200).json({
              success: true,
              msg: `Dear ${updatedUser.username}! Your account is updated successfully`
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

router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body(
      "password",
      "Password must contain at least 8 chars and must consist of min 2 uppercase, lowercase, numbers and symbols"
    ).isStrongPassword({
      minLength: 8,
      minLowercase: 2,
      minUppercase: 2,
      minNumbers: 2,
      minSymbols: 2
    })
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (user) {
          const passwordMatched = await bcrypt.compare(password, user.password);
          if (passwordMatched) {
            if (user.verified === false) {
              res.status(401).json({
                success: false,
                error: "Your account is not verified by admins"
              });
            } else {
              if (user.status === true) {
                const authenticationToken = jwt.sign(
                  { userId: user.id },
                  JWT_SECRET
                );
                if (user.role == "admin") {
                  res.cookie("admin-auth-token", authenticationToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "Strict",
                    maxAge: 14 * 24 * 60 * 60 * 1000
                  });
                } else {
                  res.cookie("user-auth-token", authenticationToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "Strict",
                    maxAge: 14 * 24 * 60 * 60 * 1000
                  });
                }
                res.status(200).json({
                  success: true,
                  msg: "Welcome back! Logged In Successfully"
                });
              } else {
                res.status(401).json({
                  success: false,
                  error:
                    "Your account is not verified. Verify it by visiting link we sent to your email to login again"
                });
              }
            }
          } else {
            res.status(401).json({
              success: false,
              error: "Login credentials are invalid"
            });
          }
        } else {
          res
            .status(404)
            .json({ success: false, error: "Login credentials are invalid" });
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
  "/verify-email/:verificationToken",
  param("verificationToken").isJWT(),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const verificationToken = req.params.verificationToken;
        jwt.verify(verificationToken, JWT_SECRET, async (err, decodedToken) => {
          if (err) {
            res.status(400).json({
              success: false,
              error: "Invalid request"
            });
          } else {
            const user = await User.findById(decodedToken.userId);
            if (user && !user.status) {
              user.status = true;
              await user.save();
              res.status(200).json({
                success: true,
                msg: "User Email Verified Successfully"
              });
            } else if (user && user.status) {
              res.status(400).json({
                success: false,
                msg: "User Email Already Verified"
              });
            } else {
              res.status(400).json({
                success: false,
                error: "Invalid request"
              });
            }
          }
        });
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

router.get(
  "/verify-user/:verificationToken",
  verifyAdminLogin,
  param("verificationToken").isJWT(),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const verificationToken = req.params.verificationToken;
        jwt.verify(verificationToken, JWT_SECRET, async (err, decodedToken) => {
          if (err) {
            res.status(400).json({
              success: false,
              error: "Invalid request"
            });
          } else {
            const user = await User.findById(decodedToken.userId);
            if (user && !user.verified) {
              user.verified = true;
              await user.save();
              res.status(200).json({
                success: true,
                msg: "User Verified Successfully"
              });
            } else if (user && user.verified) {
              res.status(400).json({
                success: false,
                msg: "User Already Verified"
              });
            } else {
              res.status(400).json({
                success: false,
                error: "Invalid request"
              });
            }
          }
        });
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

router.get(
  "/all-users",
  verifyAdminLogin,
  [
    query("status").isBoolean({ loose: false }).optional(),
    query("verified").isBoolean({ loose: false }).optional(),
    query("role").isString().isIn(["user", "admin"]).optional(),
    query("gender").isString().isIn(["male", "female"]).optional(),
    query("username")
      .isString()
      .matches(/^[a-z0-9]{6,18}$/)
      .optional(),
    query("email").isEmail().optional(),
    body("firstName")
      .matches(/^[A-Z][a-z]{3,20}$/)
      .optional(),
    body("lastName")
      .matches(/^[A-Z][a-z]{3,30}$/)
      .optional(),
    body("address")
      .isString()
      .matches(/^[a-zA-Z0-9\s,.\-]{10,70}$/)
      .optional(),
    body("profileImage").isURL().optional(),
    body("createdAt")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    body("userId").isMongoId().optional()
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        let queries = req.query;
        if (Object.keys(queries).length === 0) {
          const allUsers = await User.find().select(["-password", "-__v"]);
          if (allUsers.length === 0) {
            res.status(404).json({
              success: false,
              error: "No Users Found"
            });
          } else {
            res.status(200).json({ success: true, allUsers });
          }
        } else if (
          validateFilterQueries(queries, [
            "status",
            "verified",
            "role",
            "gender",
            "username",
            "email",
            "firstName",
            "lastName",
            "address",
            "profileImage",
            "createdAt",
            "userId"
          ])
        ) {
          if (queries.userId || queries.username || queries.email) {
            const filter = queries.userId
              ? { _id: queries.userId }
              : queries.username
              ? { username: queries.username }
              : { email: queries.email };
            const user = await User.findOne(filter).select([
              "-password",
              "-__v"
            ]);
            if (user) {
              return res.status(200).json({ success: true, user });
            } else {
              return res.status(404).json({
                success: false,
                error: "No User Found"
              });
            }
          }

          const date = new Date(queries.createdAt);

          if (queries.createdAt) {
            queries = {
              ...queries,
              createdAt: {
                $gte: date,
                $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
              }
            };
          }

          const users = await User.find(queries).select(["-password", "-__v"]);
          if (users.length === 0) {
            res.status(404).json({
              success: false,
              error: "No Users Found"
            });
          } else {
            res.status(200).json({ success: true, users });
          }
        } else {
          res.status(400).json({
            success: false,
            error: "Invalid query parameters"
          });
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

router.delete(
  "/all-users",
  verifyAdminLogin,
  [
    query("status").isBoolean({ loose: false }).optional(),
    query("verified").isBoolean({ loose: false }).optional(),
    query("role").isString().isIn(["user", "admin"]).optional(),
    query("gender").isString().isIn(["male", "female"]).optional(),
    query("username")
      .isString()
      .matches(/^[a-z0-9]{6,18}$/)
      .optional(),
    query("email").isEmail().optional(),
    body("firstName")
      .matches(/^[A-Z][a-z]{3,20}$/)
      .optional(),
    body("lastName")
      .matches(/^[A-Z][a-z]{3,30}$/)
      .optional(),
    body("address")
      .isString()
      .matches(/^[a-zA-Z0-9\s,.\-]{10,70}$/)
      .optional(),
    body("profileImage").isURL().optional(),
    body("createdAt")
      .isISO8601({
        strict: true,
        strictSeparator: true
      })
      .optional(),
    body("userId").isMongoId().optional()
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        let queries = req.query;
        if (Object.keys(queries).length === 0) {
          await Leave.deleteMany({ userId: { $ne: req.adminId } });
          await Attendance.deleteMany({ userId: { $ne: req.adminId } });
          const public_id = `${cloudinaryFolder}`;
          const exclude = [`${public_id}/${req.adminId.toString()}`];
          const result = await cloudinary.api.resources({
            type: "upload",
            resource_type: "image",
            prefix: `${public_id}/`
          });
          const allImages = result.resources.map(
            (resource) => resource.public_id
          );
          const imagesToDelete = allImages.filter(
            (id) => !exclude.includes(id)
          );
          for (const publicId of imagesToDelete) {
            await cloudinary.uploader.destroy(publicId);
          }
          const allUsers = await User.deleteMany({ _id: { $ne: req.adminId } });
          if (allUsers.deletedCount === 0) {
            res.status(404).json({
              success: false,
              error: "No User Deleted"
            });
          } else {
            res.status(200).json({
              success: true,
              msg: `${allUsers.deletedCount} users deleted successfully`
            });
          }
        } else if (
          validateFilterQueries(queries, [
            "status",
            "verified",
            "role",
            "gender",
            "username",
            "email",
            "firstName",
            "lastName",
            "address",
            "profileImage",
            "createdAt",
            "userId"
          ])
        ) {
          const user = await User.findById(req.adminId);
          if (queries.userId || queries.username || queries.email) {
            const filter =
              queries.userId && queries.userId !== req.adminId.toString()
                ? { _id: queries.userId }
                : queries.username
                ? { username: queries.username }
                : { email: queries.email };
            if (
              user.email === filter.email ||
              user.username === filter.username
            ) {
              return res.status(400).json({
                success: false,
                error: "You can't delete your own account"
              });
            }
            const userToBeDeleted = await User.findOne(filter).select([
              "-password",
              "-__v"
            ]);
            if (userToBeDeleted) {
              await cloudinary.uploader.destroy(
                `${cloudinaryFolder}/${userToBeDeleted.id.toString()}`
              );
              await Grade.deleteOne({ userId: userToBeDeleted._id });
              await Leave.deleteMany({ userId: userToBeDeleted._id });
              await Attendance.deleteMany({ userId: userToBeDeleted._id });
              await User.deleteOne(userToBeDeleted._id);
              return res
                .status(200)
                .json({ success: true, msg: "User deleted successfully" });
            } else {
              return res.status(404).json({
                success: false,
                error: "No User Found"
              });
            }
          }

          const date = new Date(queries.createdAt);

          if (queries.createdAt) {
            queries = {
              ...queries,
              createdAt: {
                $gte: date,
                $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
              }
            };
          }
          const allUsersToBeDeleted = await User.find({
            _id: { $ne: req.adminId },
            email: { $ne: user.email },
            username: { $ne: user.username },
            ...queries
          }).select("_id");

          const public_id = `${cloudinaryFolder}`;
          const result = await cloudinary.api.resources({
            type: "upload",
            resource_type: "image",
            prefix: `${public_id}/`
          });
          const allImages = result.resources.map(
            (resource) => resource.public_id
          );
          const includedImages = allUsersToBeDeleted.map(
            (user) => `${cloudinaryFolder}/${user.id.toString()}`
          );
          const imagesToDelete = allImages.filter((id) =>
            includedImages.includes(id)
          );
          for (const publicId of imagesToDelete) {
            await cloudinary.uploader.destroy(publicId);
          }

          await Grade.deleteMany({
            userId: { $in: allUsersToBeDeleted.map((user) => user._id) }
          });

          await Leave.deleteMany({
            userId: { $in: allUsersToBeDeleted.map((user) => user._id) }
          });

          await Attendance.deleteMany({
            userId: { $in: allUsersToBeDeleted.map((user) => user._id) }
          });

          const deletedUsers = await User.deleteMany({
            _id: { $ne: req.adminId },
            email: { $ne: user.email },
            username: { $ne: user.username },
            ...queries
          });

          if (deletedUsers.deletedCount === 0) {
            res.status(404).json({
              success: false,
              error: "No Users Found"
            });
          } else {
            res.status(200).json({
              success: true,
              msg: `${deletedUsers.deletedCount} users deleted successfully`
            });
          }
        } else {
          res.status(400).json({
            success: false,
            error: "Invalid query parameters"
          });
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

router.get(
  "/verify/:userId",
  verifyAdminLogin,
  param("userId").isMongoId(),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const userId = req.params.userId;
        const user = await User.findOne({
          _id: userId
        }).select(["-password", "-__v", "-createdAt", "-updatedAt"]);
        if (user) {
          if (user.verified) {
            res.status(400).json({
              success: false,
              error: "User Already Verified"
            });
          } else {
            user.verified = true;
            await user.save();
            res
              .status(200)
              .json({ success: true, msg: "User verified successfully" });
          }
        } else {
          res.status(400).json({ success: false, error: "No user found" });
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

router.post(
  "/upload",
  verifyLogin,
  upload.single("photo"),
  async (req, res) => {
    try {
      let userId = req.userId || req.adminId;
      const user = await User.findById(userId).select("profileImage");
      if (
        user.profileImage ===
          "https://cdn-icons-png.flaticon.com/512/1999/1999625.png" ||
        user.profileImage ===
          "https://cdn-icons-png.flaticon.com/512/6997/6997662.png" ||
        user.profileImage === undefined
      ) {
        const fileName = userId.toString();
        cloudinary.uploader
          .upload_stream(
            { folder: `${cloudinaryFolder}`, public_id: fileName },
            async (error, result) => {
              if (error) {
                res.status(500).json({
                  success: false,
                  error: "Error Occurred on Server Side",
                  message: error.message
                });
              } else {
                user.profileImage = result.secure_url;
                await user.save();
                res.status(200).json({
                  success: true,
                  msg: "Profile Image Uploaded Successfully"
                });
              }
            }
          )
          .end(req.file.buffer);
      } else {
        const fileName = userId.toString();
        cloudinary.uploader
          .upload_stream(
            {
              folder: `${cloudinaryFolder}`,
              public_id: fileName,
              overwrite: true
            },
            async (error, result) => {
              if (error) {
                res.status(500).json({
                  success: false,
                  error: "Error Occurred on Server Side",
                  message: error.message
                });
              } else {
                user.profileImage = result.secure_url;
                await user.save();
                res.status(200).json({
                  success: true,
                  msg: "Profile Image Updated Successfully"
                });
              }
            }
          )
          .end(req.file.buffer);
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

router.delete("/delete-photo", verifyLogin, async (req, res) => {
  try {
    const userId = req.userId || req.adminId;
    const user = await User.findById(userId).select("profileImage");
    if (user.profileImage) {
      const public_id = `${cloudinaryFolder}/${userId.toString()}`;
      await cloudinary.uploader.destroy(public_id);
      user.profileImage = undefined;
      await user.save();
      res.status(200).json({
        success: true,
        msg: "Profile Image Deleted Successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        error: "No Profile Image Found"
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

router.get("/logout", verifyLogin, async (req, res) => {
  try {
    res.clearCookie("admin-auth-token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });
    res.clearCookie("user-auth-token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });
    res.status(200).json({ success: true, msg: "Logout successfully!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error Occurred on Server Side",
      message: error.message
    });
  }
});

router.get("/verify-login", verifyLogin, async (req, res) => {
  try {
    const userId = req.userId || req.adminId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid request" });
    }
    if (user.status && user.verified) {
      if (user.role === "admin") {
        res.status(200).json({ success: true, role: "admin" });
      } else {
        res.status(200).json({ success: true, role: "user" });
      }
    } else {
      res.status(400).json({ success: false, error: "Invalid request" });
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
