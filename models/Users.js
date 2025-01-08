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
    verified: { type: Boolean, default: false },
    profileImage: {
      type: String
    }
  },
  { timestamps: true }
);

userSchema.pre("save", function(next) {
  if (!this.profileImage) {
    if (this.gender === "male") {
      this.profileImage =
        "https://cdn-icons-png.flaticon.com/512/1999/1999625.png";
    } else if (this.gender === "female") {
      this.profileImage =
        "https://cdn-icons-png.flaticon.com/512/6997/6997662.png";
    }
  }
  next();
});

const User = mongoose.model("user", userSchema);
export default User;
