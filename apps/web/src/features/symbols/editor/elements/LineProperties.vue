<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LineShapeFields } from "../types";
import ShapeStyleFields from "./ShapeStyleFields.vue";

type LFields = { _type: "shape" } & LineShapeFields;

const props = defineProps<{ fields: LFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<LFields>): void }>();

function update(updates: Partial<LFields>) {
  emit("change", updates);
}

function onDashChange(raw: string) {
  const trimmed = raw.trim();
  update({
    dashArray: trimmed
      ? trimmed.split(",").map((n) => parseFloat(n)).filter((n) => !isNaN(n))
      : undefined,
  });
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-xs">X1</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.x1)"
          @update:model-value="(v) => update({ x1: parseFloat(String(v)) || 0 })"
        />
      </div>
      <div class="space-y-2">
        <Label class="text-xs">Y1</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.y1)"
          @update:model-value="(v) => update({ y1: parseFloat(String(v)) || 0 })"
        />
      </div>
      <div class="space-y-2">
        <Label class="text-xs">X2</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.x2)"
          @update:model-value="(v) => update({ x2: parseFloat(String(v)) || 0 })"
        />
      </div>
      <div class="space-y-2">
        <Label class="text-xs">Y2</Label>
        <Input
          type="number"
          class="h-8 text-sm"
          :model-value="Math.round(props.fields.y2)"
          @update:model-value="(v) => update({ y2: parseFloat(String(v)) || 0 })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label class="text-xs">Line Cap</Label>
      <Select
        :model-value="props.fields.lineCap ?? 'butt'"
        @update:model-value="(v) => update({ lineCap: v as LineShapeFields['lineCap'] })"
      >
        <SelectTrigger class="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="butt">Butt</SelectItem>
          <SelectItem value="round">Round</SelectItem>
          <SelectItem value="square">Square</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label class="text-xs">Dash (e.g. 5,5)</Label>
      <Input
        class="h-8 text-sm"
        placeholder="5,5"
        :model-value="props.fields.dashArray?.join(',') ?? ''"
        @update:model-value="(v) => onDashChange(String(v))"
      />
    </div>

    <ShapeStyleFields :fields="props.fields" @change="(u) => update(u as Partial<LFields>)" />
  </div>
</template>
