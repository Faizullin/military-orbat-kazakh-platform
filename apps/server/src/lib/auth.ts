import { getAuthServer } from "@repo/auth";
import { env } from "./env";

export const auth = getAuthServer({
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.CORS_ORIGIN,
});

export type { Session } from "@repo/auth";
