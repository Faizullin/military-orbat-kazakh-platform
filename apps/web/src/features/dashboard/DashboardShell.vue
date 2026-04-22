<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import { LayoutDashboardIcon } from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { dashboardNavItems } from "./dashboardNav";

const route = useRoute();
</script>

<template>
  <SidebarProvider class="h-svh overflow-hidden">
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton as-child size="lg" tooltip="ORBAT Mapper">
              <router-link to="/">
                <div
                  class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md"
                >
                  <LayoutDashboardIcon class="size-4" />
                </div>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">ORBAT Mapper</span>
                  <span class="truncate text-xs">Dashboard</span>
                </div>
              </router-link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in dashboardNavItems" :key="item.routeName">
                <SidebarMenuButton
                  as-child
                  :is-active="route.name === item.routeName"
                  :tooltip="item.label"
                >
                  <router-link :to="{ name: item.routeName }">
                    <component :is="item.icon" />
                    <span>{{ item.label }}</span>
                  </router-link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>

    <SidebarInset class="min-w-0 overflow-hidden">
      <header
        class="bg-background/95 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur"
      >
        <SidebarTrigger />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <span class="text-sm font-medium">Dashboard</span>
      </header>
      <div class="min-h-0 flex-1 overflow-hidden">
        <RouterView />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
