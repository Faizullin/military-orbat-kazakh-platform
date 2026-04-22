<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { CanvasObject, TextFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";

const props = defineProps<{
  element: CanvasObject;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", evt: any): void;
}>();

const store = useSymbolEditorStore();
const fields = computed(() => props.element.fields as { _type: "text" } & TextFields);
const transform = computed(() => props.element.transform);
const properties = computed(() => props.element.properties);

const fontStyle = computed(() => {
  const parts = [
    fields.value.fontWeight === "bold" ? "bold" : "",
    fields.value.fontStyle === "italic" ? "italic" : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "normal";
});

const config = computed(() => ({
  id: props.element.id,
  x: transform.value.x,
  y: transform.value.y,
  width: transform.value.width ?? 200,
  text: fields.value.text,
  fontSize: fields.value.fontSize ?? 16,
  fontFamily: fields.value.fontFamily ?? "Arial",
  fontStyle: fontStyle.value,
  textDecoration: fields.value.textDecoration,
  align: fields.value.textAlign,
  letterSpacing: fields.value.letterSpacing,
  lineHeight: fields.value.lineHeight,
  fill: fields.value.color ?? "#000000",
  rotation: transform.value.rotation,
  draggable: !properties.value?.locked && !isEditing.value,
  visible: !isEditing.value,
}));

function onDragStart() {
  store.bringToFront(props.element.id);
}

function onDragEnd(e: any) {
  const node = e.target;
  store.updateObject(props.element.id, {
    transform: { ...transform.value, x: node.x(), y: node.y() },
  });
}

function onTransform(e: any) {
  const node = e.target;
  const scaleX = node.scaleX();
  const newWidth = node.width() * scaleX;
  node.setAttrs({ width: newWidth, scaleX: 1 });
  store.updateObject(
    props.element.id,
    { transform: { ...transform.value, width: Math.max(30, newWidth) } },
    false,
  );
}

// ─── Inline editing ───────────────────────────────────────
const isEditing = ref(false);
const editorValue = ref("");
const editorStyle = ref<Record<string, string>>({});
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function onDblClick(e: any) {
  if (properties.value?.locked) return;
  const node = e.target;
  const stage = node.getStage?.();
  if (!stage) return;

  const containerRect = stage.container().getBoundingClientRect();
  const absPos = node.getAbsolutePosition();
  const stageScale = stage.scaleX() || 1;
  const width = (transform.value.width ?? 200) * stageScale;
  const fontSize = (fields.value.fontSize ?? 16) * stageScale;
  const lineHeight = fields.value.lineHeight ?? 1.2;

  editorValue.value = fields.value.text;
  editorStyle.value = {
    position: "fixed",
    top: `${containerRect.top + absPos.y}px`,
    left: `${containerRect.left + absPos.x}px`,
    width: `${width}px`,
    minHeight: `${fontSize * lineHeight}px`,
    fontSize: `${fontSize}px`,
    fontFamily: fields.value.fontFamily ?? "Arial",
    fontWeight: fields.value.fontWeight === "bold" ? "bold" : "normal",
    fontStyle: fields.value.fontStyle === "italic" ? "italic" : "normal",
    lineHeight: String(lineHeight),
    color: fields.value.color ?? "#000000",
    textAlign: (fields.value.textAlign ?? "left") as string,
    border: "1px solid #3b82f6",
    background: "white",
    padding: "0",
    margin: "0",
    outline: "none",
    resize: "none",
    overflow: "hidden",
    zIndex: "9999",
    boxSizing: "border-box",
  };
  isEditing.value = true;

  nextTick(() => {
    textareaRef.value?.focus();
    textareaRef.value?.select();
  });
}

function commitEdit() {
  if (!isEditing.value) return;
  const next = editorValue.value;
  isEditing.value = false;
  if (next !== fields.value.text) {
    store.updateObject(props.element.id, {
      fields: { ...fields.value, text: next },
    });
  }
}

function cancelEdit() {
  isEditing.value = false;
}

function onKeyDown(e: KeyboardEvent) {
  e.stopPropagation();
  if (e.key === "Escape") {
    e.preventDefault();
    cancelEdit();
  } else if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    commitEdit();
  }
}
</script>

<template>
  <v-text
    :config="config"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dblclick="onDblClick"
    @dbltap="onDblClick"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @transform="onTransform"
    @transformend="store.pushCurrentToHistory()"
  />
  <Teleport to="body">
    <textarea
      v-if="isEditing"
      ref="textareaRef"
      v-model="editorValue"
      :style="editorStyle"
      @blur="commitEdit"
      @keydown="onKeyDown"
    />
  </Teleport>
</template>
