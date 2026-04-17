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

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }
  loading.value = true;
  try {
    await authStore.register(name.value, email.value, password.value);
    router.push("/login");
  } catch (e: any) {
    error.value = e.message || "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">Create Account</CardTitle>
        <p class="text-sm text-muted-foreground">Sign up for ORBAT Mapper</p>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="handleSubmit">
          <Alert v-if="error" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <div class="grid gap-2">
            <Label for="name">Name</Label>
            <Input
              id="name"
              v-model="name"
              type="text"
              placeholder="Your name"
              required
              autocomplete="name"
            />
          </div>
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
              autocomplete="new-password"
            />
          </div>
          <div class="grid gap-2">
            <Label for="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
            />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? "Creating account..." : "Create account" }}
          </Button>
          <p class="text-center text-sm text-muted-foreground">
            Already have an account?
            <router-link to="/login" class="text-primary underline-offset-4 hover:underline">
              Sign in
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
