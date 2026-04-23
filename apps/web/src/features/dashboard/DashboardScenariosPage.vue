<script setup lang="ts">
import {
  FileInputIcon,
  FolderOpenIcon,
  PlusIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StoredScenarioBrowser from "@/components/StoredScenarioBrowser.vue";
import { useBrowserScenarios } from "@/composables/browserScenarios";
import { IMPORT_SCENARIO_ROUTE, NEW_SCENARIO_ROUTE } from "@/router/names";

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
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="border-b px-6 py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <FolderOpenIcon class="text-muted-foreground size-5" />
            <h1 class="text-2xl font-semibold tracking-tight">Scenarios</h1>
            <Badge variant="secondary">{{ storedScenarios.length }}</Badge>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            Saved scenarios and import workflow for your workspace.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
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

    <section class="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
      <div class="flex h-full min-h-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <StoredScenarioBrowser
          v-if="storedScenarios.length"
          class="h-full w-full"
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
        <div
          v-else
          class="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm"
        >
          <span>No scenarios found.</span>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <Button as-child size="sm">
              <router-link :to="{ name: NEW_SCENARIO_ROUTE }">
                <PlusIcon class="size-4" />
                Create scenario
              </router-link>
            </Button>
            <Button as-child variant="outline" size="sm">
              <router-link :to="{ name: IMPORT_SCENARIO_ROUTE }">
                <FileInputIcon class="size-4" />
                Import scenario
              </router-link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
