import mongoose from "mongoose";
import { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";

const userSchema = new Schema(
  {
    avatar: {
      url: { type: String, default: "https://www.google.com", required: true },
      localPath: { type: String },
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String },
    forgotPasswordToken: { type: String },
    forgotPasswordExpiry: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};
userSchema.methods.generateTemporaryToken = async function () {
  const unhashedToken = crypto.randomBytes(256).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

  return { unhashedToken, hashedToken, tokenExpiry };
};

export const User = mongoose.model("user", userSchema);
