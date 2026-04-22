<script setup lang="ts">
import {
  CompassIcon,
  FileInputIcon,
  FolderOpenIcon,
  PlusIcon,
  ShieldIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StoredScenarioBrowser from "@/components/StoredScenarioBrowser.vue";
import { DEMO_SCENARIOS, useBrowserScenarios } from "@/composables/browserScenarios";
import {
  IMPORT_SCENARIO_ROUTE,
  MAP_EDIT_MODE_ROUTE,
  NEW_SCENARIO_ROUTE,
} from "@/router/names";

const {
  storedScenarios,
  sortOptions,
  sortDirection,
  toggleSortDirection,
  onAction,
  onBulkAction,
} = useBrowserScenarios();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-y-auto">
    <header class="border-b px-6 py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <FolderOpenIcon class="text-muted-foreground size-5" />
            <h1 class="text-2xl font-semibold tracking-tight">Scenarios</h1>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ storedScenarios.length }} stored scenario{{
              storedScenarios.length === 1 ? "" : "s"
            }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button as-child>
            <router-link :to="{ name: NEW_SCENARIO_ROUTE }">
              <PlusIcon class="size-4" />
              New scenario
            </router-link>
          </Button>
          <Button as-child variant="secondary">
            <router-link :to="{ name: IMPORT_SCENARIO_ROUTE }">
              <FileInputIcon class="size-4" />
              Import
            </router-link>
          </Button>
        </div>
      </div>
    </header>

    <section class="grid gap-4 p-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <ShieldIcon class="size-5" />
            Local workspace
          </CardTitle>
          <CardDescription>Saved scenarios remain in browser storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{{ storedScenarios.length }} available</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <CompassIcon class="size-5" />
            Demo library
          </CardTitle>
          <CardDescription>Bundled historical scenarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">{{ DEMO_SCENARIOS.length }} demos</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileInputIcon class="size-5" />
            Import pipeline
          </CardTitle>
          <CardDescription>Shared, copied, and transferred scenario data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button as-child variant="outline" size="sm">
            <router-link :to="{ name: IMPORT_SCENARIO_ROUTE }">Open import</router-link>
          </Button>
        </CardContent>
      </Card>
    </section>

    <section class="min-h-0 flex-1 px-6 pb-6">
      <div class="rounded-lg border bg-card p-4 shadow-sm">
        <StoredScenarioBrowser
          v-if="storedScenarios.length"
          :scenarios="storedScenarios"
          :sort-options="sortOptions"
          :sort-direction="sortDirection"
          search-input-id="dashboard-scenario-search"
          show-clear-button
          enable-batch-actions
          empty-message="No scenarios match"
          @action="onAction"
          @bulk-action="onBulkAction"
          @toggle-sort-direction="toggleSortDirection"
        />
        <div v-else class="grid gap-4 md:grid-cols-2">
          <router-link
            v-for="scenario in DEMO_SCENARIOS"
            :key="scenario.id"
            :to="{ name: MAP_EDIT_MODE_ROUTE, params: { scenarioId: `demo-${scenario.id}` } }"
            class="group overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow hover:shadow-md"
          >
            <img
              :src="scenario.imageUrl"
              :alt="scenario.name"
              class="h-48 w-full object-cover object-top"
            />
            <div class="p-4">
              <h2 class="font-semibold group-hover:underline">{{ scenario.name }}</h2>
              <p class="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {{ scenario.summary }}
              </p>
            </div>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>
