import { createAuthClient } from "better-auth/vue";

// Auth client for Vue apps — uses cookie-based auth, infers baseURL from current origin.
// Usage in Vue:
//   import { signIn, signUp, signOut, useSession } from "@repo/auth/client";
//   const session = useSession();

const client = createAuthClient();

export const authClient = client;
export const signIn = client.signIn;
export const signUp = client.signUp;
export const signOut = client.signOut;
export const useSession = client.useSession;
