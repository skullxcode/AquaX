import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import villageRoutes from "./routes/village.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import usersRoutes from "./routes/users.routes.js";

const app = express();
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ success: false, message: "Untrusted request origin." });
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later." },
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/villages", villageRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", operationsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "P2002") {
    return res.status(409).json({ success: false, message: "A record with this unique value already exists." });
  }
  if (error.code === "P2034") {
    return res.status(409).json({ success: false, message: "A concurrent update conflicted with this operation. Please retry." });
  }
  if (error.code === "P2003" || error.code === "P2025") {
    return res.status(409).json({ success: false, message: "This operation conflicts with related records." });
  }
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "An unexpected server error occurred." : error.message,
  });
});

export default app;
