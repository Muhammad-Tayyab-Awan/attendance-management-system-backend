import jwt from "jsonwebtoken";
import validator from "validator";
import User from "../models/Users.js";
const JWT_SECRET = process.env.JWT_SECRET;

const verifyAdminLogin = async (req, res, next) => {
  try {
    const token = req.cookies["admin-auth-token"];
    if (token && validator.isJWT(token)) {
      jwt.verify(token, JWT_SECRET, async (err, decodedToken) => {
        if (err) {
          res.status(401).json({ success: false, error: "Invalid request" });
        } else {
          const user = await User.findById(decodedToken.userId);
          if (user && user.status === true) {
            if (user.role === "user") {
              res
                .status(401)
                .json({ success: false, error: "Invalid request" });
            }
            req.memberId = user._id;
            next();
          } else {
            res.status(401).json({ success: false, error: "Invalid request" });
          }
        }
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid request" });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error Occurred on Server Side",
      message: error.message
    });
  }
};

export default verifyAdminLogin;
