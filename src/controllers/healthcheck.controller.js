import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const healthCheck = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, { message: "server is running, health is ok..." }),
    );
});
