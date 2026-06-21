import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", router);

// Serve built frontend static files (for Railway / production deployments)
// The frontend is built to artifacts/boutique-pro/dist/public
const frontendDistPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "boutique-pro",
  "dist",
  "public",
);

app.use(express.static(frontendDistPath));

// SPA fallback — serve index.html for any non-API route
app.get("/{*path}", (_req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // In dev mode on Replit the frontend runs separately — this is expected
      res.status(404).json({ error: "Not found" });
    }
  });
});

export default app;
