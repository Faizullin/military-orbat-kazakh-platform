<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShapeBase } from "../types";

const props = defineProps<{ fields: ShapeBase }>();
const emit = defineEmits<{ (e: "change", updates: Partial<ShapeBase>): void }>();

function update(updates: Partial<ShapeBase>) {
  emit("change", updates);
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label class="text-xs">Fill Color</Label>
      <div class="flex gap-2">
        <Input
          type="color"
          class="h-8 w-10 cursor-pointer p-1"
          :model-value="props.fields.fill || '#3b82f6'"
          @update:model-value="(v) => update({ fill: String(v) })"
        />
        <Input
          class="h-8 text-sm"
          :model-value="props.fields.fill || '#3b82f6'"
          @update:model-value="(v) => update({ fill: String(v) })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label class="text-xs">Stroke Color</Label>
      <div class="flex gap-2">
        <Input
          type="color"
          class="h-8 w-10 cursor-pointer p-1"
          :model-value="props.fields.stroke || '#000000'"
          @update:model-value="(v) => update({ stroke: String(v) })"
        />
        <Input
          class="h-8 text-sm"
          :model-value="props.fields.stroke || '#000000'"
          @update:model-value="(v) => update({ stroke: String(v) })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label class="text-xs">Stroke Width</Label>
      <Input
        type="number"
        class="h-8 text-sm"
        :model-value="props.fields.strokeWidth ?? 1"
        @update:model-value="(v) => update({ strokeWidth: parseFloat(String(v)) || 0 })"
      />
    </div>

    <div class="space-y-2">
      <Label class="text-xs">
        Opacity ({{ Math.round((props.fields.opacity ?? 1) * 100) }}%)
      </Label>
      <Input
        type="range"
        min="0"
        max="1"
        step="0.01"
        class="h-4"
        :model-value="props.fields.opacity ?? 1"
        @update:model-value="(v) => update({ opacity: parseFloat(String(v)) })"
      />
    </div>
  </div>
</template>
