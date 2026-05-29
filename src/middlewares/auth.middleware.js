import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1. Extract token
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request: No token provided.");
  }

  // 2. Decode and verify
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Find user and exclude sensitive fields
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      // This case means the token was valid, but the user it refers to no longer exists
      throw new ApiError(401, "Invalid access token: User not found.");
    }

    // 4. Inject user into request object
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, "Unauthorized: Token verification failed.");
  }
});
