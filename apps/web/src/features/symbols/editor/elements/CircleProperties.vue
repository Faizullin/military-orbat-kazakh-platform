<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CircleShapeFields } from "../types";
import ShapeStyleFields from "./ShapeStyleFields.vue";

type CircleFields = { _type: "shape" } & CircleShapeFields;

const props = defineProps<{ fields: CircleFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<CircleFields>): void }>();

function update(updates: Partial<CircleFields>) {
  emit("change", updates);
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-xs">Radius</Label>
      <Input
        type="number"
        class="h-8 text-sm"
        :model-value="Math.round(props.fields.radius || 0)"
        @update:model-value="(v) => update({ radius: parseFloat(String(v)) || 0 })"
      />
    </div>
    <ShapeStyleFields :fields="props.fields" @change="(u) => update(u as Partial<CircleFields>)" />
  </div>
</template>
