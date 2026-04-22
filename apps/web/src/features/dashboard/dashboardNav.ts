import type { Component } from "vue";
import { FolderOpenIcon, MapIcon } from "lucide-vue-next";
import {
  DASHBOARD_SCENARIOS_ROUTE,
  DASHBOARD_SYMBOLS_ROUTE,
} from "@/router/names";

export interface DashboardNavItem {
  label: string;
  routeName: string;
  icon: Component;
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    label: "Scenarios",
    routeName: DASHBOARD_SCENARIOS_ROUTE,
    icon: FolderOpenIcon,
  },
  {
    label: "Topographical symbols",
    routeName: DASHBOARD_SYMBOLS_ROUTE,
    icon: MapIcon,
  },
];
