// Custom router — PROTECTED from upstream sync
// Modified to include auth routes and guards
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/login", name: "Login", component: () => import("@/modules/auth/LoginView.vue") },
  { path: "/", name: "Home", component: () => import("@/views/LandingPage.vue") },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Auth guard
router.beforeEach((to) => {
  // placeholder guard logic
});
