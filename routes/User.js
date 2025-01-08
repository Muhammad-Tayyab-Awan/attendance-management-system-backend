import express from "express";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import { body, cookie, param, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import mailTransporter from "../utils/mailTransporter.js";
import verifyLogin from "../middlewares/verifyLogin.js";

const JWT_SECRET = process.env.JWT_SECRET;
const API_URI = process.env.API_URI;

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
                const user = await User.findById(decodedToken.adminId);
                if (user && user.role === "admin" && user.verified === true) {
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
                const htmlMessage = `<h2>Dear ${user.firstName} ${user.lastName}! Please verify your email by visiting the link below</h2><a href="${API_URI}/api/user/verify-email/${verificationToken}">Verify Now</a>`;
                const adminMessage = `<h2>Dear ${user.firstName} ${user.lastName}! A new user account has been created. Please verify the account by visiting the link below</h2><a href="${API_URI}/api/user/verify-user/${verificationToken}">Verify Now</a>`;
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
      const user = await User.findByIdAndDelete(userId);
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
            if (user.status === true) {
              const authenticationToken = jwt.sign(
                { userId: user.id },
                JWT_SECRET
              );
              if (user.role == "admin") {
                res.cookie("admin-auth-token", authenticationToken, {
                  httpOnly: true
                });
              } else {
                res.cookie("user-auth-token", authenticationToken, {
                  httpOnly: true
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
                msg: "User Verified Successfully"
              });
            } else if (user && user.status) {
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

export default router;
