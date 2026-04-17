<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    const redirect = (router.currentRoute.value.query.redirect as string) || "/";
    router.push(redirect);
  } catch (e: any) {
    error.value = e.message || "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">ORBAT Mapper</CardTitle>
        <p class="text-sm text-muted-foreground">Sign in to your account</p>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="handleSubmit">
          <Alert v-if="error" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
            />
          </div>
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? "Signing in..." : "Sign in" }}
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            No account?
            <router-link to="/register" class="text-primary underline-offset-4 hover:underline">
              Register
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
