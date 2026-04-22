<script setup lang="ts">
import { computed } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Trash2Icon,
  LockIcon,
  LockOpenIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowUpToLineIcon,
  ArrowDownToLineIcon,
} from "lucide-vue-next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CanvasObjectTransform } from "./types";
import { useSymbolEditorStore } from "./editorStore";
import { definitionForFields } from "./elementRegistry";

const store = useSymbolEditorStore();

const element = computed(() => store.singleSelected);
const def = computed(() => (element.value ? definitionForFields(element.value.fields) : undefined));

function updateTransform(updates: Partial<CanvasObjectTransform>) {
  if (!element.value) return;
  store.updateObject(element.value.id, {
    transform: { ...element.value.transform, ...updates },
  });
}

function updateFields(updates: Record<string, unknown>) {
  if (!element.value) return;
  store.updateObject(element.value.id, {
    fields: { ...element.value.fields, ...updates } as any,
  });
}

function toggleLocked() {
  if (!element.value) return;
  store.updateObject(element.value.id, {
    properties: {
      ...element.value.properties,
      locked: !element.value.properties?.locked,
    },
  });
}

function toggleVisible() {
  if (!element.value) return;
  store.updateObject(element.value.id, {
    properties: {
      ...element.value.properties,
      visible: element.value.properties?.visible === false,
    },
  });
}
</script>

<template>
  <div v-if="store.selectedIds.length === 0 || !element" class="text-muted-foreground p-6 text-center">
    <p class="text-sm">Select an element to edit its properties.</p>
  </div>

  <div
    v-else-if="store.selectedIds.length > 1"
    class="bg-card flex h-full flex-col gap-6 p-6"
  >
    <div class="space-y-1">
      <h3 class="text-sm font-semibold">Multiple Selection</h3>
      <p class="text-muted-foreground text-xs">
        {{ store.selectedIds.length }} elements selected
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="sm"
        @click="store.selectedIds.forEach((id) => store.bringToFront(id))"
      >
        <ArrowUpToLineIcon class="mr-2 h-4 w-4" />
        Front
      </Button>
      <Button
        variant="outline"
        size="sm"
        @click="store.selectedIds.forEach((id) => store.sendToBack(id))"
      >
        <ArrowDownToLineIcon class="mr-2 h-4 w-4" />
        Back
      </Button>
    </div>

    <Button
      variant="destructive"
      size="sm"
      @click="store.selectedIds.forEach((id) => store.deleteObject(id))"
    >
      <Trash2Icon class="mr-2 h-4 w-4" />
      Delete All
    </Button>
  </div>

  <div v-else class="bg-card flex h-full flex-col">
    <div
      class="bg-muted/20 sticky top-0 z-10 flex items-center justify-between border-b p-4"
    >
      <div class="flex flex-col">
        <h3 class="text-sm font-semibold capitalize">
          {{ def?.label ?? element.fields._type }}
        </h3>
        <span class="text-muted-foreground font-mono text-[10px]">{{ element.id }}</span>
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          :title="element.properties?.locked ? 'Unlock' : 'Lock'"
          @click="toggleLocked"
        >
          <LockIcon v-if="element.properties?.locked" class="h-4 w-4" />
          <LockOpenIcon v-else class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          :title="element.properties?.visible === false ? 'Show' : 'Hide'"
          @click="toggleVisible"
        >
          <EyeOffIcon v-if="element.properties?.visible === false" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-destructive h-8 w-8"
          @click="store.deleteObject(element.id)"
        >
          <Trash2Icon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <Tabs default-value="transform" class="flex-1 overflow-y-auto">
      <div class="bg-muted/5 border-b px-4 py-2">
        <TabsList class="h-8 w-full">
          <TabsTrigger value="transform" class="flex-1 text-xs">Layout</TabsTrigger>
          <TabsTrigger value="style" class="flex-1 text-xs">Style</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="transform" class="space-y-4 p-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="el-x" class="text-xs">X</Label>
            <Input
              id="el-x"
              type="number"
              class="h-8 text-sm"
              :model-value="Math.round(element.transform.x)"
              @update:model-value="(v) => updateTransform({ x: parseFloat(String(v)) || 0 })"
            />
          </div>
          <div class="space-y-2">
            <Label for="el-y" class="text-xs">Y</Label>
            <Input
              id="el-y"
              type="number"
              class="h-8 text-sm"
              :model-value="Math.round(element.transform.y)"
              @update:model-value="(v) => updateTransform({ y: parseFloat(String(v)) || 0 })"
            />
          </div>
        </div>

        <div
          v-if="element.transform.width !== undefined && element.transform.width !== null"
          class="grid grid-cols-2 gap-4"
        >
          <div class="space-y-2">
            <Label for="el-w" class="text-xs">Width</Label>
            <Input
              id="el-w"
              type="number"
              class="h-8 text-sm"
              :model-value="Math.round(element.transform.width || 0)"
              @update:model-value="(v) => updateTransform({ width: parseFloat(String(v)) || 0 })"
            />
          </div>
          <div
            v-if="element.transform.height !== undefined && element.transform.height !== null"
            class="space-y-2"
          >
            <Label for="el-h" class="text-xs">Height</Label>
            <Input
              id="el-h"
              type="number"
              class="h-8 text-sm"
              :model-value="Math.round(element.transform.height || 0)"
              @update:model-value="(v) => updateTransform({ height: parseFloat(String(v)) || 0 })"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="el-r" class="text-xs">Rotation (°)</Label>
          <Input
            id="el-r"
            type="number"
            class="h-8 text-sm"
            :model-value="Math.round(element.transform.rotation || 0)"
            @update:model-value="(v) => updateTransform({ rotation: parseFloat(String(v)) || 0 })"
          />
        </div>

        <div class="space-y-2 border-t pt-2">
          <Label class="text-xs font-medium">Layering</Label>
          <div class="mt-1 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs"
              @click="store.bringToFront(element.id)"
            >
              <ArrowUpToLineIcon class="mr-1 h-3.5 w-3.5" />
              To Front
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs"
              @click="store.sendToBack(element.id)"
            >
              <ArrowDownToLineIcon class="mr-1 h-3.5 w-3.5" />
              To Back
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="style" class="space-y-4 p-4">
        <component
          :is="def?.propertiesFields"
          v-if="def?.propertiesFields"
          :fields="element.fields"
          @change="(u: any) => updateFields(u)"
        />
        <p v-else class="text-muted-foreground text-xs">
          No style options for this element.
        </p>
      </TabsContent>
    </Tabs>
  </div>
</template>
