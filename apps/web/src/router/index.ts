// Custom router — PROTECTED from upstream sync
// All upstream routes + auth routes and guards
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import LandingPage from "@/views/LandingPage.vue";
import {
  CHART_EDIT_MODE_ROUTE,
  MAPLIBRE_ROUTE,
  GRID_EDIT_ROUTE,
  IMPORT_SCENARIO_ROUTE,
  LANDING_PAGE_ROUTE,
  LOGIN_ROUTE,
  MAP_EDIT_MODE_ROUTE,
  NEW_SCENARIO_ROUTE,
  REGISTER_ROUTE,
  STORY_MODE_ROUTE,
  SYMBOL_BROWSER_ROUTE,
  SYMBOL_LIBRARY_ROUTE,
  TEXT_TO_ORBAT_ROUTE,
} from "@/router/names";

declare module "vue-router" {
  interface RouteMeta {
    helpUrl?: string;
    public?: boolean;
  }
}

// Upstream views (lazy)
const ScenarioEditorWrapper = () =>
  import("@/modules/scenarioeditor/ScenarioEditorWrapper.vue");
const NewScenarioView = () => import("@/modules/scenarioeditor/NewScenarioView.vue");
const StoryModeView = () => import("@/modules/storymode/StoryModeWrapper.vue");
const TextToOrbatView = () => import("@/views/texttoorbat/TextToOrbatView.vue");
const ImportScenarioView = () => import("@/views/ImportScenarioView.vue");
const SymbolBrowserView = () => import("@/views/SymbolBrowserView.vue");
const GridEditView = () => import("@/modules/scenarioeditor/GridEditView.vue");
const ChartEditView = () => import("@/modules/scenarioeditor/ChartEditView.vue");
const ScenarioEditorMap = () => import("@/modules/scenarioeditor/ScenarioEditorMap.vue");
const ScenarioEditorMaplibre = () =>
  import("@/modules/maplibreview/ScenarioEditorMaplibre.vue");

// Custom auth views (from features/)
const LoginView = () => import("@/features/auth/LoginView.vue");
const RegisterView = () => import("@/features/auth/RegisterView.vue");

// Custom feature views (lazy)
const LibraryView = () => import("@/features/symbols/LibraryView.vue");

const routes = [
  // Auth (public)
  {
    path: "/login",
    name: LOGIN_ROUTE,
    component: LoginView,
    meta: { public: true },
  },
  {
    path: "/register",
    name: REGISTER_ROUTE,
    component: RegisterView,
    meta: { public: true },
  },

  // Custom feature routes
  {
    path: "/library",
    name: SYMBOL_LIBRARY_ROUTE,
    component: LibraryView,
  },

  // Upstream routes
  {
    path: "/scenario/:scenarioId",
    props: true,
    component: ScenarioEditorWrapper,
    beforeEnter: () => {
      NProgress.start();
    },
    children: [
      {
        path: "",
        name: MAP_EDIT_MODE_ROUTE,
        component: ScenarioEditorMap,
        meta: { helpUrl: "https://docs.orbat-mapper.app/guide/map-edit-mode" },
      },
      {
        path: "grid-edit",
        name: GRID_EDIT_ROUTE,
        component: GridEditView,
        meta: { helpUrl: "https://docs.orbat-mapper.app/guide/grid-edit-mode" },
      },
      {
        path: "chart-edit",
        name: CHART_EDIT_MODE_ROUTE,
        component: ChartEditView,
        meta: { helpUrl: "https://docs.orbat-mapper.app/guide/chart-edit-mode" },
      },
      {
        path: "maplibre",
        name: MAPLIBRE_ROUTE,
        component: ScenarioEditorMaplibre,
      },
    ],
  },
  {
    path: "/newscenario",
    name: NEW_SCENARIO_ROUTE,
    component: NewScenarioView,
    beforeEnter: () => {
      NProgress.start();
    },
  },
  {
    path: "/storymode",
    name: STORY_MODE_ROUTE,
    component: StoryModeView,
    beforeEnter: () => {
      NProgress.start();
    },
  },
  {
    path: "/text-to-orbat",
    name: TEXT_TO_ORBAT_ROUTE,
    component: TextToOrbatView,
  },
  {
    path: "/import",
    name: IMPORT_SCENARIO_ROUTE,
    component: ImportScenarioView,
  },
  {
    path: "/symbol-browser",
    name: SYMBOL_BROWSER_ROUTE,
    component: SymbolBrowserView,
    meta: { public: true },
  },
  {
    path: "/globe/:scenarioId",
    redirect: (to: any) => ({ name: MAPLIBRE_ROUTE, params: to.params }),
  },
  {
    path: "/",
    name: LANDING_PAGE_ROUTE,
    component: LandingPage,
    meta: { public: true },
  },
] as RouteRecordRaw[];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

// Auth guard
router.beforeEach(async (to) => {
  if (to.meta.public) return;

  try {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data?.session) return;
    }
  } catch {
    // Network error — treat as unauthenticated
  }

  return { name: LOGIN_ROUTE, query: { redirect: to.fullPath } };
});

router.afterEach(() => {
  NProgress.done();
});
