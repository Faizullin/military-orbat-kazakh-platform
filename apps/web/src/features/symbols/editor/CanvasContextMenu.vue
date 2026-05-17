<script setup lang="ts">
import { computed } from "vue";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ClipboardIcon,
  CopyIcon,
  CopyPlusIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { useSymbolEditorStore } from "./editorStore";

const props = defineProps<{
  selectionIds: string[];
}>();

const store = useSymbolEditorStore();

const actionSelectionIds = computed(() => props.selectionIds);
const hasSelection = computed(() => actionSelectionIds.value.length > 0);
const singleSelection = computed(() => actionSelectionIds.value.length === 1);
const canPaste = computed(() => store.clipboard !== null);

function copy() {
  if (actionSelectionIds.value.length === 1) {
    store.copyObject(actionSelectionIds.value[0]);
  }
}

function paste() {
  store.pasteObject();
}

function duplicate() {
  if (actionSelectionIds.value.length === 1) {
    store.duplicateObject(actionSelectionIds.value[0]);
  }
}

function remove() {
  actionSelectionIds.value.slice().forEach((id) => store.deleteObject(id));
}

function bringToFront() {
  if (!hasSelection.value) return;
  actionSelectionIds.value.slice().forEach((id) => store.bringToFront(id));
  store.pushCurrentToHistory();
}

function sendToBack() {
  if (!hasSelection.value) return;
  actionSelectionIds.value.slice().forEach((id) => store.sendToBack(id));
  store.pushCurrentToHistory();
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-56">
      <ContextMenuItem :disabled="!singleSelection" @select="copy">
        <CopyIcon />
        <span>Copy</span>
        <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem :disabled="!canPaste" @select="paste">
        <ClipboardIcon />
        <span>Paste</span>
        <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem :disabled="!singleSelection" @select="duplicate">
        <CopyPlusIcon />
        <span>Duplicate</span>
        <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem :disabled="!hasSelection" @select="bringToFront">
        <ArrowUpToLineIcon />
        <span>Bring to front</span>
      </ContextMenuItem>
      <ContextMenuItem :disabled="!hasSelection" @select="sendToBack">
        <ArrowDownToLineIcon />
        <span>Send to back</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem :disabled="!hasSelection" variant="destructive" @select="remove">
        <Trash2Icon />
        <span>Delete</span>
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
