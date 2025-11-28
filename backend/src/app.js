// backend/src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";

import authRouter from "./routes/auth.js";

import { fileURLToPath } from "url";
import apiRouter from "./routes/index.routes.js";
import { notFound, errorHandler } from "./middlewares/errors.middleware.js";

dotenv.config();

const app = express();

// --- Paths absolutos (para Windows también) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

// Helmet: permite embebidos cross-origin (imágenes)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS normal
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Servir /uploads de forma estática con header CORP relajado
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// API principal
app.use("/api", apiRouter);
app.use("/auth", authRouter);
// 404 y error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT,() =>
  console.log(`API escuchando en http://localhost:${PORT}`)
);

export default app;
