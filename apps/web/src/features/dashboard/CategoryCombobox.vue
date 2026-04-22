<script setup lang="ts">
import { computed, ref } from "vue";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "./categoryOptions";

const props = defineProps<{
  id?: string;
  categories: CategoryOption[];
  placeholder?: string;
}>();

const modelValue = defineModel<string>({ default: "" });

const open = ref(false);
const query = ref("");
const newCategory = ref("");

const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const filteredCategories = computed(() => {
  if (!normalizedQuery.value) return props.categories;
  return props.categories.filter((category) =>
    category.label.toLowerCase().includes(normalizedQuery.value),
  );
});

const selectedLabel = computed(() => {
  const selected = props.categories.find(
    (category) => category.value === modelValue.value,
  );
  return selected?.label ?? modelValue.value;
});

function selectCategory(value: string) {
  modelValue.value = value;
  query.value = "";
  open.value = false;
}

function clearCategory() {
  modelValue.value = "";
  query.value = "";
}

function addCategory() {
  const next = newCategory.value.trim();
  if (!next) return;
  modelValue.value = next;
  newCategory.value = "";
  query.value = "";
  open.value = false;
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        :id="id"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between"
      >
        <span
          class="truncate"
          :class="!selectedLabel && 'text-muted-foreground'"
        >
          {{ selectedLabel || placeholder || "Select category" }}
        </span>
        <ChevronsUpDownIcon class="text-muted-foreground size-4" />
      </Button>
    </PopoverTrigger>

    <PopoverContent class="w-[--reka-popover-trigger-width] min-w-64 p-0" align="start">
      <div class="flex items-center border-b px-3">
        <SearchIcon class="text-muted-foreground mr-2 size-4" />
        <Input
          v-model="query"
          class="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          placeholder="Search categories..."
        />
      </div>

      <div class="max-h-56 overflow-y-auto p-1">
        <button
          v-if="modelValue"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
          @click="clearCategory"
        >
          <XIcon class="size-4" />
          No category
        </button>

        <button
          v-for="category in filteredCategories"
          :key="category.value"
          type="button"
          :class="
            cn(
              'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
              modelValue === category.value && 'bg-accent text-accent-foreground',
            )
          "
          @click="selectCategory(category.value)"
        >
          <CheckIcon
            :class="
              cn(
                'size-4',
                modelValue === category.value ? 'opacity-100' : 'opacity-0',
              )
            "
          />
          <span class="truncate">{{ category.label }}</span>
        </button>

        <p
          v-if="filteredCategories.length === 0"
          class="text-muted-foreground px-2 py-6 text-center text-sm"
        >
          No categories found.
        </p>
      </div>

      <div class="border-t p-2">
        <div class="flex gap-2">
          <Input
            v-model="newCategory"
            placeholder="Add new category"
            @keydown.enter.prevent="addCategory"
          />
          <Button
            type="button"
            size="icon"
            :disabled="!newCategory.trim()"
            aria-label="Add category"
            @click="addCategory"
          >
            <PlusIcon class="size-4" />
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
