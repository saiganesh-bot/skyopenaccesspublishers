import compression from "compression";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { xss } from "express-xss-sanitizer";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import routes from "./routes/index.js";

export const app = express();
app.set("etag", false);

const configuredOrigins = String(env.clientOrigin || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDevLoopbackOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || "");

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== "production" && isDevLoopbackOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(globalLimiter);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "journal-management-api",
    dbConnected: Boolean(req.app.locals.isDbConnected)
  });
});

const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
};

app.use("/api", noCache, routes);

app.use(notFound);
app.use(errorHandler);
