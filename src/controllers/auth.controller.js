import { access } from "node:fs";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  sendEmail,
  verifyMailMailgenContent,
  passwordResetMailgenContent,
} from "../utils/mail.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res, next) => {
  const { email, username, password, fullname } = req.body;

  // 1. Check if user already exists
  const userExist = await User.findOne({ email });
  if (userExist) {
    throw new ApiError(409, "User with email already exists");
  }

  // 2. Create user
  const user = await User.create({
    username,
    email,
    password,
    fullname,
    isEmailVerified: false,
  });

  // 3. Generate tokens
  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  user.save({ validateBeforeSave: false });

  // 4. Send verification email
  await sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: verifyMailMailgenContent(
      user.username,
      `${req.protocol}://${req.get("HOST")}/api/v1/users/verify-email/${unhashedToken}`,
    ),
  });

  // 5. Fetch user without sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email sent successfully",
      ),
    );
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating access tokens...",
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation
  if (!email) {
    throw new ApiError(400, "email is required");
  }
  // 2. Find User
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, `User doesn't exist with email ${email}`);
  }

  // 3. Password Check
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "password is incorrect");
  }

  // 4. Generate Tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  // 5. Cookie Options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { token: { accessToken: accessToken, refreshToken: refreshToken } },
        "User logged in successfully...",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. Clear refresh token in the database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: "" },
    },
    { new: true },
  );

  // 2. Define cookie options (must match the options used during login)
  const options = {
    httpOnly: true,
    secure: true,
  };

  // 3. Clear cookies and send response
  return res
    .status(200)
    .clearCookie("accessToken", options) // Clear access token cookie
    .clearCookie("refreshToken", options) // Clear refresh token cookie
    .json(new ApiResponse(200, {}, "User logged out successfully")); // Send a success response
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email verified"));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }
  // generate temp tokens
  const { unhashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  user.save({ validateBeforeSave: false });

  //send Email
  sendEmail({
    email: user.email,
    subject: "verify-email",
    mailgenContent: verifyMailMailgenContent(
      user.username,
      `${req.protocol}://${req.get("HOST")}/api/v1/users/verify-email/${unhashedToken}`,
    ),
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "email send successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { incomingRefreshToken } =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Empty refresh token");
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decoded?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token expired");
    }

    const { accessToken, refreshToken } =
      await user.generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, {}, "Refresh token generated successfully"));
  } catch (err) {
    throw new ApiError(401, "Invalid Refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "No user exist with this email");
  }

  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Reset password",
    mailgenContent: passwordResetMailgenContent(
      user.username,
      `${req.protocol}://${req.get("HOST")}/api/v1/users/reset-password/${unhashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset mail sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { unhashedToken } = req.params;
  const { newPassword } = req.body;

  const hashToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const checkPass = await user.isPasswordCorrect(oldPassword);

  if (!checkPass) {
    throw new ApiError(400, "Invalid old password");
  }
  
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetPassword,
  changePassword,
};
