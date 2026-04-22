<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRoute, onBeforeRouteLeave } from "vue-router";
import { Loader2Icon } from "lucide-vue-next";
import { useSymbolsApi } from "@/features/api/symbols";
import { useSymbolEditorStore } from "./editorStore";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import EditorCanvas from "./EditorCanvas.vue";
import EditorToolbar from "./EditorToolbar.vue";
import PropertiesPanel from "./PropertiesPanel.vue";

const route = useRoute();
const store = useSymbolEditorStore();
const { getSymbol } = useSymbolsApi();

useKeyboardShortcuts();

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (!store.isDirty) return;
  e.preventDefault();
  e.returnValue = "";
}

onMounted(async () => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  const id = String(route.params.id);
  store.isLoading = true;
  try {
    const sym = await getSymbol(id);
    store.loadFromCode(sym.id, sym.code ?? null);
  } catch (e) {
    store.errorMessage = e instanceof Error ? e.message : "Failed to load symbol";
  } finally {
    store.isLoading = false;
  }
});

onBeforeRouteLeave(() => {
  if (!store.isDirty) return true;
  return window.confirm(
    "You have unsaved changes. Leave without saving?",
  );
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  store.reset();
});
</script>

<template>
  <div class="bg-background flex h-screen flex-col overflow-hidden">
    <EditorToolbar />

    <div v-if="store.isLoading" class="flex flex-1 items-center justify-center">
      <Loader2Icon class="text-muted-foreground h-8 w-8 animate-spin" />
    </div>

    <div v-else class="flex flex-1 overflow-hidden">
      <!-- Canvas area -->
      <div class="flex flex-1 items-start justify-center overflow-auto p-6">
        <EditorCanvas />
      </div>

      <!-- Properties panel -->
      <div class="bg-card w-72 shrink-0 overflow-y-auto border-l">
        <PropertiesPanel />
      </div>
    </div>
  </div>
</template>
