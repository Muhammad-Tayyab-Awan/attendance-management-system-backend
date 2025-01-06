import express from "express";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import mailTransporter from "../utils/mailTransporter.js";

const JWT_SECRET = process.env.JWT_SECRET;
const API_URI = process.env.API_URI;

const router = express.Router();

router.post(
  "/",
  [
    body(
      "username",
      "Username must consist of 6 to 18 chars (lowercase and numbers only)"
    )
      .isString()
      .matches(/^[a-z0-9]{6,18}$/),
    body("email", "Enter a valid email").isEmail(),
    body(),
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
      .matches(/^[a-zA-Z0-9\s,.\-]{10,70}$/)
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        const { password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        req.body.password = hashedPassword;
        User.create(req.body).then(async (user) => {
          const verificationToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "1h"
          });
          const htmlMessage = `<h2>Dear ${user.firstName} ${user.lastName}! Please verify your email by visiting the link below</h2><a href="${API_URI}/api/user/verify-user/${verificationToken}">Verify Now</a>`;
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
