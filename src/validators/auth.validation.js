import { z } from "zod";

export const registerUserSchema = z.object({
  fullname: z
    .string()
    .min(3, "Full name must be at least 3 characters long")
    .max(50, "Full name cannot exceed 50 characters")
    .trim(),
  email: z
    .string()
    .email("Email is invalid")
    .trim()
    .nonempty("Email cannot be empty"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username cannot exceed 30 characters")
    .trim(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const loginUserSchema = z.object({
  email: z
    .string()
    .email("Email is invalid")
    .trim()
    .nonempty("Email cannot be empty"),
  password: z.string().trim().nonempty("Password cannot be empty"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Email is invalid")
    .trim()
    .nonempty("Email cannot be empty"),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .trim()
    .nonempty("New password cannot be empty")
    .min(6, "New password must be at least 6 characters long"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().trim().nonempty(),
  newPassword: z
    .string()
    .trim()
    .nonempty("New password cannot be empty")
    .min(6, "New password must be at least 6 characters long"),
});
