<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, Trash2Icon } from "lucide-vue-next";
import type { PolygonShapeFields } from "../types";
import ShapeStyleFields from "./ShapeStyleFields.vue";

type PolyFields = { _type: "shape" } & PolygonShapeFields;

const props = defineProps<{ fields: PolyFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<PolyFields>): void }>();

function update(updates: Partial<PolyFields>) {
  emit("change", updates);
}

function updatePoint(index: number, axis: "x" | "y", value: number) {
  const next = props.fields.points.map((p, i) =>
    i === index ? { ...p, [axis]: value } : p,
  );
  update({ points: next });
}

function addPoint() {
  const last = props.fields.points[props.fields.points.length - 1] ?? { x: 0, y: 0 };
  update({ points: [...props.fields.points, { x: last.x + 20, y: last.y + 20 }] });
}

function removePoint(index: number) {
  if (props.fields.points.length <= 2) return;
  update({ points: props.fields.points.filter((_, i) => i !== index) });
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <Label class="text-xs">Closed</Label>
      <Switch
        :model-value="props.fields.closed ?? true"
        @update:model-value="(v) => update({ closed: Boolean(v) })"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-xs">Points ({{ props.fields.points.length }})</Label>
        <Button variant="ghost" size="icon" class="h-6 w-6" @click="addPoint">
          <PlusIcon class="h-3 w-3" />
        </Button>
      </div>
      <div class="max-h-48 space-y-1 overflow-y-auto">
        <div
          v-for="(pt, i) in props.fields.points"
          :key="i"
          class="flex items-center gap-1"
        >
          <span class="text-muted-foreground w-4 shrink-0 text-[10px]">{{ i + 1 }}</span>
          <Input
            type="number"
            class="h-7 text-xs"
            :model-value="Math.round(pt.x)"
            @update:model-value="(v) => updatePoint(i, 'x', parseFloat(String(v)) || 0)"
          />
          <Input
            type="number"
            class="h-7 text-xs"
            :model-value="Math.round(pt.y)"
            @update:model-value="(v) => updatePoint(i, 'y', parseFloat(String(v)) || 0)"
          />
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive h-6 w-6 shrink-0"
            :disabled="props.fields.points.length <= 2"
            @click="removePoint(i)"
          >
            <Trash2Icon class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>

    <ShapeStyleFields :fields="props.fields" @change="(u) => update(u as Partial<PolyFields>)" />
  </div>
</template>
