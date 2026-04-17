import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { env } from "./lib/env";
import { authRoutes } from "./routes/auth";
import { scenarios } from "./routes/scenarios";
import { symbols } from "./routes/symbols";
import { upload } from "./routes/upload";
import { ai } from "./routes/ai";

const app = new Hono()
  .use("*", logger())
  .use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  .get("/api/health", (c) => c.json({ status: "ok" }))
  .route("/api/auth", authRoutes)
  .route("/api/scenarios", scenarios)
  .route("/api/symbols", symbols)
  .route("/api/symbols", upload)
  .route("/api/ai", ai);

export type AppType = typeof app;

console.log(`Server running on http://localhost:${env.PORT}`);
serve({ fetch: app.fetch, port: env.PORT });

export default app;
