<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Undo2Icon,
  Redo2Icon,
  SaveIcon,
  Loader2Icon,
  ArrowLeftIcon,
  ImageDownIcon,
  SparklesIcon,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useSymbolEditorStore } from "./editorStore";
import { elementRegistry, TOOLBAR_ELEMENT_KEYS } from "./elementRegistry";
import { DASHBOARD_SYMBOLS_ROUTE } from "@/router/names";
import AiGenerateDialog from "./AiGenerateDialog.vue";

const store = useSymbolEditorStore();
const router = useRouter();

const aiDialogOpen = ref(false);

function addElement(key: string) {
  const def = elementRegistry[key];
  if (!def) return;
  store.addObject(def.createDefault());
}
</script>

<template>
  <div class="bg-card flex items-center gap-1 border-b px-3 py-2">
    <Button
      variant="ghost"
      size="icon"
      title="Back to symbols"
      @click="router.push({ name: DASHBOARD_SYMBOLS_ROUTE })"
    >
      <ArrowLeftIcon class="h-4 w-4" />
    </Button>
    <div class="bg-border mx-1 h-5 w-px" />

    <Button
      v-for="key in TOOLBAR_ELEMENT_KEYS"
      :key="key"
      variant="ghost"
      size="icon"
      :title="`Add ${elementRegistry[key]?.label}`"
      @click="addElement(key)"
    >
      <component :is="elementRegistry[key]?.icon" class="h-4 w-4" />
    </Button>

    <div class="bg-border mx-1 h-5 w-px" />

    <Button
      variant="ghost"
      size="icon"
      title="Undo (Ctrl+Z)"
      :disabled="!store.canUndo"
      @click="store.undo()"
    >
      <Undo2Icon class="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      title="Redo (Ctrl+Y)"
      :disabled="!store.canRedo"
      @click="store.redo()"
    >
      <Redo2Icon class="h-4 w-4" />
    </Button>

    <div class="ml-auto flex items-center gap-2">
      <span v-if="store.errorMessage" class="text-destructive text-xs">
        {{ store.errorMessage }}
      </span>
      <span
        v-if="store.isDirty"
        class="text-muted-foreground text-xs"
        title="Unsaved changes"
      >
        Unsaved
      </span>
      <Button
        size="sm"
        :disabled="store.isSaving || !store.isDirty"
        @click="store.save()"
      >
        <Loader2Icon v-if="store.isSaving" class="mr-1 h-4 w-4 animate-spin" />
        <SaveIcon v-else class="mr-1 h-4 w-4" />
        Save<span v-if="store.isDirty" class="ml-0.5">*</span>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        :disabled="store.isSaving || store.isConverting"
        title="Export transparent thumbnail and SVG map asset"
        @click="store.convert()"
      >
        <Loader2Icon
          v-if="store.isConverting"
          class="mr-1 h-4 w-4 animate-spin"
        />
        <ImageDownIcon v-else class="mr-1 h-4 w-4" />
        Convert
      </Button>
      <Button
        size="sm"
        variant="secondary"
        title="Generate canvas objects from a reference image with AI"
        @click="aiDialogOpen = true"
      >
        <SparklesIcon class="mr-1 h-4 w-4" />
        AI
      </Button>
    </div>

    <AiGenerateDialog v-model:open="aiDialogOpen" />
  </div>
</template>
