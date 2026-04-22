<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ArcShapeFields } from "../types";
import ShapeStyleFields from "./ShapeStyleFields.vue";

type ArcFields = { _type: "shape" } & ArcShapeFields;

const props = defineProps<{ fields: ArcFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<ArcFields>): void }>();

function update(updates: Partial<ArcFields>) {
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
        :model-value="Math.round(props.fields.radius)"
        @update:model-value="(v) => update({ radius: parseFloat(String(v)) || 1 })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-xs">Start Angle (°)</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.startAngle)"
          @update:model-value="(v) => update({ startAngle: parseFloat(String(v)) || 0 })"
        />
      </div>
      <div class="space-y-2">
        <Label class="text-xs">End Angle (°)</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.endAngle)"
          @update:model-value="(v) => update({ endAngle: parseFloat(String(v)) || 90 })"
        />
      </div>
    </div>

    <div class="flex items-center justify-between">
      <Label class="text-xs">Closed (pie slice)</Label>
      <Switch
        :model-value="props.fields.closed ?? false"
        @update:model-value="(v) => update({ closed: Boolean(v) })"
      />
    </div>

    <ShapeStyleFields :fields="props.fields" @change="(u) => update(u as Partial<ArcFields>)" />
  </div>
</template>
