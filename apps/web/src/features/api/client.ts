import { hc } from "hono/client";
import type { AppType } from "@repo/server";
import { router } from "@/router";
import { LOGIN_ROUTE } from "@/router/names";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Custom fetch that handles 401 → login redirect.
 * Passed to hc() so every RPC call goes through it.
 */
const authFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (res.status === 401) {
    router.push({ name: LOGIN_ROUTE, query: { redirect: router.currentRoute.value.fullPath } });
    throw new ApiError(401, "Session expired");
  }

  return res;
};

/**
 * Fully typed Hono RPC client.
 *
 * Usage:
 *   const res = await api.api.scenarios.$get();
 *   const data = await res.json(); // ← typed
 */
export const api = hc<AppType>("/", { fetch: authFetch });
