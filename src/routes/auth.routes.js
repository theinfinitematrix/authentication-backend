import express from "express";
import {
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
} from "../controllers/auth.controller.js";
import {
  registerUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validation.js";
import { validate } from "../middlewares/validate.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", validate(registerUserSchema), registerUser);

router.post("/login", validate(loginUserSchema), loginUser);

router.get("/user", verifyJWT, getCurrentUser);

router.post("/logout", verifyJWT, logoutUser);

router.get("/resend-email", verifyJWT, resendEmailVerification);

router.get("/verify-email/:verificationToken", verifyEmail);

router.post("/refresh-token", refreshAccessToken);

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  forgotPasswordRequest,
);

router.post(
  "/reset-password/:unhashedToken",
  validate(resetPasswordSchema),
  resetPassword,
);

router.post(
  "/change-password",
  verifyJWT,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
