import morgan from "morgan";
import { env } from "../config/env.js";

export function requestLogger() {
  if (env.NODE_ENV === "test") {
    return (req, res, next) => next();
  }

  return morgan("tiny");
}
