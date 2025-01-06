import express from "express";
import User from "../models/Users.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World!");
});

export default router;
