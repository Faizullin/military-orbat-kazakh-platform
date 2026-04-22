<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TextFields } from "../types";

type TFields = { _type: "text" } & TextFields;

const props = defineProps<{ fields: TFields }>();
const emit = defineEmits<{ (e: "change", updates: Partial<TFields>): void }>();

function update(updates: Partial<TFields>) {
  emit("change", updates);
}
</script>

<template>
  <div class="bg-muted/10 space-y-4 rounded-md border p-3">
    <div class="space-y-2">
      <Label for="text-content" class="text-xs">Content</Label>
      <Input
        id="text-content"
        class="h-8 text-sm"
        :model-value="props.fields.text || ''"
        @update:model-value="(v) => update({ text: String(v) })"
      />
    </div>

    <div class="space-y-2">
      <Label for="text-fontSize" class="text-xs">Font Size</Label>
      <Input
        id="text-fontSize"
        type="number"
        class="h-8 text-sm"
        :model-value="props.fields.fontSize || 16"
        @update:model-value="(v) => update({ fontSize: parseFloat(String(v)) || 16 })"
      />
    </div>

    <div class="space-y-2">
      <Label for="text-fontFamily" class="text-xs">Font Family</Label>
      <Input
        id="text-fontFamily"
        class="h-8 text-sm"
        :model-value="props.fields.fontFamily || 'Arial'"
        @update:model-value="(v) => update({ fontFamily: String(v) })"
      />
    </div>

    <div class="space-y-2">
      <Label class="text-xs">Color</Label>
      <div class="flex gap-2">
        <Input
          type="color"
          class="h-8 w-10 cursor-pointer p-1"
          :model-value="props.fields.color || '#000000'"
          @update:model-value="(v) => update({ color: String(v) })"
        />
        <Input
          class="h-8 text-sm"
          :model-value="props.fields.color || '#000000'"
          @update:model-value="(v) => update({ color: String(v) })"
        />
      </div>
    </div>
  </div>
</template>
