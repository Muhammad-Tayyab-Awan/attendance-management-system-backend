import mongoose from "mongoose";
const DB_URI = process.env.DB_URI;

const connect = async () => {
  await mongoose.connect(DB_URI);
};

const connectToDatabase = async () => {
  await connect();
  return { success: true, msg: "Connected to Database" };
};

export default connectToDatabase;
