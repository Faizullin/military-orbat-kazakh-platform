import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";

export interface AuthServerOptions {
  trustedOrigins?: string[];
  secret?: string;
}

/**
 * Factory that returns a fully configured Better Auth server instance.
 * The consuming app provides its dynamic configuration (e.g., trustedOrigins).
 */
export function getAuthServer(options: AuthServerOptions = {}) {
  return betterAuth({
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
}

// Export the inferred types
export type AuthServer = ReturnType<typeof getAuthServer>;
export type Session = AuthServer["$Infer"]["Session"];
