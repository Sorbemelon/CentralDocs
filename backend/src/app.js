import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { demoSessionMiddleware } from "./middleware/demoSessionMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { chatRouter } from "./routes/chat.routes.js";
import { demoRouter } from "./routes/demo.routes.js";
import { documentRouter } from "./routes/document.routes.js";
import { folderRouter } from "./routes/folder.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { trashRouter } from "./routes/trash.routes.js";

export const app = express();

app.disable("x-powered-by");
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

function isLocalDevOrigin(origin) {
  if (env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CLIENT_ORIGINS.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed."));
    },
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/api/health"),
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger());
app.use(demoSessionMiddleware);

app.use("/api/health", healthRouter);
app.use("/api/demo", demoRouter);
app.use("/api/folders", folderRouter);
app.use("/api/documents", documentRouter);
app.use("/api/search", searchRouter);
app.use("/api/chats", chatRouter);
app.use("/api/trash", trashRouter);

app.use(notFound);
app.use(errorHandler);
