<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RectShapeFields } from "../types";
import ShapeStyleFields from "./ShapeStyleFields.vue";

type RectFields = { _type: "shape" } & RectShapeFields;

const props = defineProps<{ fields: RectFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<RectFields>): void }>();

function update(updates: Partial<RectFields>) {
  emit("change", updates);
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-xs">Corner Radius</Label>
      <Input
        type="number"
        class="h-8 text-sm"
        :model-value="props.fields.cornerRadius ?? 0"
        @update:model-value="(v) => update({ cornerRadius: parseFloat(String(v)) || 0 })"
      />
    </div>
    <ShapeStyleFields :fields="props.fields" @change="(u) => update(u as Partial<RectFields>)" />
  </div>
</template>
