import { createAuthClient } from "better-auth/vue";

/**
 * Factory that returns a fully configured Better Auth client.
 * The consuming app provides its own baseURL (e.g. from env vars).
 */
export function getAuthClient(baseURL?: string) {
  return createAuthClient({ baseURL });
}
