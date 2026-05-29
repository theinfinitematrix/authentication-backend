import { ApiError } from "../utils/api-error.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const extractedError =
      result.error?.errors?.map((err) => ({
        path: err.path[0],
        message: err.message,
      })) || [];

    throw new ApiError(422, "Received data is not valid", extractedError, "");
  }

  req.body = result.data;
  next();
};
