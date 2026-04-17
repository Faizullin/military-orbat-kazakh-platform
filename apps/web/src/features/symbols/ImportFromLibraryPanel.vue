<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSymbolsApi, type ServerSymbolListItem } from "@/features/api/symbols";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ShapesIcon } from "lucide-vue-next";

const emit = defineEmits<{
  import: [symbol: ServerSymbolListItem];
  cancel: [void];
}>();

const { listSymbols } = useSymbolsApi();
const items = ref<ServerSymbolListItem[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    items.value = await listSymbols();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : "Failed to load symbols";
  } finally {
    loading.value = false;
  }
}

function thumbUrl(s: ServerSymbolListItem) {
  return s.thumbnail?.url ?? s.attachment?.url ?? "";
}

onMounted(load);
</script>

<template>
  <div class="rounded border border-dashed p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold">Import from your symbol library</h3>
      <Button variant="ghost" size="sm" @click="emit('cancel')">Close</Button>
    </div>

    <p v-if="loading" class="text-muted-foreground text-sm">Loading…</p>
    <p v-else-if="loadError" class="text-destructive text-sm">{{ loadError }}</p>

    <div
      v-else-if="items.length"
      class="grid max-h-[40vh] grid-cols-3 gap-x-2 gap-y-4 overflow-auto p-1"
    >
      <button
        v-for="s in items"
        :key="s.id"
        type="button"
        class="flex flex-col items-center rounded border border-transparent p-3 hover:border-gray-500"
        @click="emit('import', s)"
      >
        <img
          v-if="thumbUrl(s)"
          :src="thumbUrl(s)"
          :alt="s.name"
          class="h-16 w-16 object-contain"
        />
        <div
          v-else
          class="bg-muted flex h-16 w-16 items-center justify-center rounded text-xs"
        >
          no image
        </div>
        <p class="mt-1 text-center text-sm break-words">{{ s.name }}</p>
        <p v-if="s.category" class="text-muted-foreground text-xs">{{ s.category }}</p>
      </button>
    </div>

    <Empty v-else class="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShapesIcon />
        </EmptyMedia>
        <EmptyTitle>No symbols in your library</EmptyTitle>
        <EmptyDescription>
          Create symbols in the symbol editor first, then import them here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
</template>
