import type { Context, Next } from "hono";
import { auth, type Session } from "@repo/auth";

export type AuthEnv = {
  Variables: {
    user: Session["user"];
    session: Session["session"];
  };
};

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
}
