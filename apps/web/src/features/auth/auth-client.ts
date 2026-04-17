import { getAuthClient } from "@repo/auth/client";

export const authClient = getAuthClient(import.meta.env.VITE_API_BASE_URL);
