import { defineStore } from "pinia";
import { computed } from "vue";
import { authClient } from "./auth-client";
import { router } from "@/router";
import { LOGIN_ROUTE } from "@/router/names";

export const useAuthStore = defineStore("auth", () => {
  const session = authClient.useSession();

  const user = computed(() => session.value?.data?.user ?? null);
  const isAuthenticated = computed(() => !!user.value);
  const isLoading = computed(() => session.value?.isPending ?? true);

  async function login(email: string, password: string) {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message ?? "Login failed");
  }

  async function register(name: string, email: string, password: string) {
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) throw new Error(error.message ?? "Registration failed");
  }

  async function logout() {
    await authClient.signOut();
    router.push({ name: LOGIN_ROUTE });
  }

  return { user, isAuthenticated, isLoading, login, register, logout };
});
