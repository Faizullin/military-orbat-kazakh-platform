<script setup lang="ts">
import { computed, ref } from "vue";
import {
  type ColumnSizingState,
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useVueTable,
} from "@tanstack/vue-table";
import { useDebounce, useLocalStorage } from "@vueuse/core";
import { SearchIcon, XIcon } from "lucide-vue-next";
import ToeGridTableMenu from "@/modules/scenarioeditor/ToeGridTableMenu.vue";
import { valueUpdater } from "@/modules/grid/helpers";
import type { ServerSymbolListItem } from "@/features/api/symbols";
import { createSymbolTableColumns } from "./symbolTableColumns";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const props = defineProps<{
  symbols: ServerSymbolListItem[];
  actionLoadingId?: string | null;
}>();

const emit = defineEmits<{
  (e: "view", symbol: ServerSymbolListItem): void;
  (e: "edit", symbol: ServerSymbolListItem): void;
  (e: "upload-thumbnail", symbol: ServerSymbolListItem): void;
  (e: "upload-attachment", symbol: ServerSymbolListItem): void;
  (e: "duplicate", symbol: ServerSymbolListItem): void;
  (e: "delete", symbol: ServerSymbolListItem): void;
}>();

const query = ref("");
const debouncedQuery = useDebounce(query, 200);
const sorting = useLocalStorage<SortingState>("dashboard-symbols-table-sorting", []);
const columnSizing = useLocalStorage<ColumnSizingState>(
  "dashboard-symbols-table-column-sizing",
  {},
);
const columnVisibility = useLocalStorage<Record<string, boolean>>(
  "dashboard-symbols-table-column-visibility",
  {},
);

const columns = computed(() =>
  createSymbolTableColumns({
    onView: (symbol) => emit("view", symbol),
    onEdit: (symbol) => emit("edit", symbol),
    onUploadThumbnail: (symbol) => emit("upload-thumbnail", symbol),
    onUploadAttachment: (symbol) => emit("upload-attachment", symbol),
    onDuplicate: (symbol) => emit("duplicate", symbol),
    onDelete: (symbol) => emit("delete", symbol),
    actionLoadingId: props.actionLoadingId,
  }),
);

const table = useVueTable({
  get data() {
    return props.symbols;
  },
  get columns() {
    return columns.value;
  },
  state: {
    get globalFilter() {
      return debouncedQuery.value;
    },
    get sorting() {
      return sorting.value;
    },
    get columnSizing() {
      return columnSizing.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    },
  },
  getRowId: (row) => row.id,
  columnResizeMode: "onChange",
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onGlobalFilterChange: (updateOrValue) => valueUpdater(updateOrValue, query),
  onSortingChange: (updateOrValue) => valueUpdater(updateOrValue, sorting),
  onColumnSizingChange: (updateOrValue) => valueUpdater(updateOrValue, columnSizing),
  onColumnVisibilityChange: (updateOrValue) =>
    valueUpdater(updateOrValue, columnVisibility),
});

const rows = computed(() => table.getRowModel().rows);
const filteredCount = computed(() => table.getFilteredRowModel().rows.length);

function clearQuery() {
  query.value = "";
}

function onEsc(event: KeyboardEvent) {
  if (!query.value) return;
  event.stopPropagation();
  clearQuery();
}
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col">
    <header class="flex shrink-0 flex-col gap-3 pb-3 sm:flex-row sm:items-center">
      <div class="min-w-0 flex-1">
        <label for="dashboard-symbol-search" class="sr-only">Search symbols</label>
        <InputGroup class="max-w-xl">
          <InputGroupAddon aria-hidden="true">
            <SearchIcon class="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            id="dashboard-symbol-search"
            v-model="query"
            placeholder="Search symbols..."
            autocomplete="off"
            @keydown.esc="onEsc"
          />
          <InputGroupAddon v-if="query" align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              aria-label="Clear symbol search"
              @click="clearQuery"
            >
              <XIcon class="size-3.5" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <p class="text-muted-foreground shrink-0 text-sm">
        {{ filteredCount }} / {{ symbols.length }}
      </p>
    </header>

    <section
      class="min-h-0 flex-1 overflow-auto rounded-lg border"
      tabindex="0"
    >
      <table class="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              role="columnheader"
              class="relative border-b px-4 py-3 font-medium whitespace-nowrap"
              :class="[
                header.column.getCanSort() && 'cursor-pointer select-none',
                header.column.id === 'actions' && 'sticky right-0 z-30 bg-muted text-right',
              ]"
              :style="{
                width: `${header.getSize()}px`,
                minWidth: `${header.getSize()}px`,
              }"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <template v-if="!header.isPlaceholder">
                <div
                  class="flex items-center gap-1"
                  :class="header.column.id === 'actions' ? 'justify-end' : ''"
                >
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                  <span
                    v-if="header.column.getCanSort() && header.column.getIsSorted()"
                    class="text-muted-foreground text-xs uppercase"
                  >
                    {{ header.column.getIsSorted() === "asc" ? "asc" : "desc" }}
                  </span>
                </div>
                <div
                  v-if="header.column.getCanResize()"
                  role="separator"
                  class="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-primary/10"
                  :class="header.column.getIsResizing() ? 'bg-primary/10' : ''"
                  @click.stop
                  @dblclick="header.column.resetSize()"
                  @mousedown="header.getResizeHandler()($event)"
                  @touchstart="header.getResizeHandler()($event)"
                />
              </template>
              <div
                v-if="header.column.id === 'actions'"
                class="absolute top-1/2 right-1 -translate-y-1/2"
                @click.stop
              >
                <ToeGridTableMenu :table="table" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b even:bg-muted/35 hover:bg-muted/60"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="border-b px-4 py-3 align-middle"
              :class="cell.column.id === 'actions' && 'sticky right-0 bg-card text-right'"
              :style="{
                width: `${cell.column.getSize()}px`,
                minWidth: `${cell.column.getSize()}px`,
              }"
            >
              <FlexRender
                v-if="!cell.getIsPlaceholder()"
                :render="cell.column.columnDef.cell"
                :props="cell.getContext()"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
