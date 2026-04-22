<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Loader2Icon, RefreshCwIcon, ShapesIcon } from "lucide-vue-next";
import { activeScenarioKey } from "@/components/injects";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { injectStrict } from "@/utils";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import type { ServerSymbolListItem } from "@/features/api/symbols";
import { useMapTopographicSymbols } from "./useMapTopographicSymbols";

interface Props {
  addUnit: (sidc: string) => void;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const scenario = injectStrict(activeScenarioKey);
const toolbarStore = useMainToolbarStore();
const isOpen = ref(false);

const {
  symbols,
  placeableSymbols,
  loading,
  loaded,
  error,
  loadSymbols,
  getSymbolSrc,
  registerSymbol,
} = useMapTopographicSymbols(scenario);

const hasSymbols = computed(() => symbols.value.length > 0);
const triggerTitle = computed(() =>
  props.disabled ? "Select a parent unit before adding a symbol" : "Topographic symbols",
);

watch(isOpen, (open) => {
  if (open) void loadSymbols();
});

function openPicker() {
  toolbarStore.clearToolbar();
}

function placeSymbol(symbol: ServerSymbolListItem) {
  const sidc = registerSymbol(symbol);
  if (!sidc) return;

  props.addUnit(sidc);
  isOpen.value = false;
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger :title="triggerTitle" as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :disabled="props.disabled"
        @click="openPicker()"
      >
        <ShapesIcon class="size-5" :class="{ 'text-primary': isOpen }" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="w-[min(22rem,calc(100vw-1rem))] p-2"
      align="center"
      side="top"
      :sideOffset="10"
      @keydown.esc.stop="isOpen = false"
    >
      <div class="mb-2 flex items-center justify-between gap-2 px-1">
        <div class="flex min-w-0 items-center gap-2">
          <ShapesIcon class="text-muted-foreground size-4 shrink-0" />
          <p class="truncate text-sm font-medium">Topographic symbols</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Refresh"
          :disabled="loading"
          @click="loadSymbols({ force: true })"
        >
          <RefreshCwIcon class="size-4" :class="{ 'animate-spin': loading }" />
        </Button>
      </div>

      <div v-if="loading && !loaded" class="flex h-24 items-center justify-center">
        <Loader2Icon class="text-muted-foreground size-5 animate-spin" />
      </div>

      <div v-else-if="error" class="p-3 text-center text-xs text-destructive">
        {{ error }}
      </div>

      <div
        v-else-if="!hasSymbols"
        class="text-muted-foreground flex h-24 flex-col items-center justify-center gap-2 text-center text-xs"
      >
        <ShapesIcon class="size-7" />
        <span>No topographic symbols</span>
      </div>

      <div
        v-else-if="placeableSymbols.length === 0"
        class="text-muted-foreground flex h-24 flex-col items-center justify-center gap-2 text-center text-xs"
      >
        <ShapesIcon class="size-7" />
        <span>No map-ready symbols</span>
      </div>

      <ScrollArea v-else class="h-72 pr-3">
        <div class="grid grid-cols-4 gap-2 p-1">
          <button
            v-for="symbol in placeableSymbols"
            :key="symbol.id"
            type="button"
            :title="symbol.category ? `${symbol.name} (${symbol.category})` : symbol.name"
            class="hover:border-primary focus-visible:ring-ring/50 bg-background flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-md border border-transparent p-1.5 transition outline-none focus-visible:ring-[3px]"
            @click="placeSymbol(symbol)"
          >
            <img
              :src="getSymbolSrc(symbol)!"
              :alt="symbol.name"
              class="h-full w-full object-contain"
            />
          </button>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
