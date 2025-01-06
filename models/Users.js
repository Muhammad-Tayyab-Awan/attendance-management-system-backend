import mongoose, { Schema } from "mongoose";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      required: true
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true
    },
    address: {
      type: String,
      required: true
    },
    status: { type: Boolean, default: false },
    profileImage: {
      type: String,
      default: () => {
        if (this.gender === "male") {
          return "https://cdn-icons-png.flaticon.com/512/1999/1999625.png";
        } else {
          return "https://cdn-icons-png.flaticon.com/512/6997/6997662.png";
        }
      }
    }
  },
  { timestamps: true }
);

const User = mongoose.model("user", userSchema);
export default User;
