<script setup lang="ts">
import { computed } from "vue";
import type { CanvasObject, ArrowShapeFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";

const props = defineProps<{
  element: CanvasObject;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", evt: any): void;
}>();

const store = useSymbolEditorStore();
const fields = computed(() => props.element.fields as { _type: "shape" } & ArrowShapeFields);
const properties = computed(() => props.element.properties);

const showHandles = computed(
  () => props.isSelected && store.selectedIds.length === 1 && !properties.value?.locked,
);

const pointers = computed(() => {
  const head = fields.value.arrowHead ?? "end";
  return {
    pointerAtBeginning: head === "start" || head === "both",
    pointerAtEnd: head === "end" || head === "both",
  };
});

const arrowConfig = computed(() => ({
  id: props.element.id,
  x: 0,
  y: 0,
  points: [fields.value.x1, fields.value.y1, fields.value.x2, fields.value.y2],
  stroke: fields.value.stroke ?? "#000000",
  strokeWidth: fields.value.strokeWidth ?? 2,
  fill: fields.value.stroke ?? "#000000",
  pointerAtBeginning: pointers.value.pointerAtBeginning,
  pointerAtEnd: pointers.value.pointerAtEnd,
  pointerLength: fields.value.arrowSize ?? 10,
  pointerWidth: fields.value.arrowSize ?? 10,
  lineCap: fields.value.lineCap ?? "butt",
  dash: fields.value.dashArray,
  opacity: fields.value.opacity ?? 1,
  draggable: !properties.value?.locked,
  hitStrokeWidth: 12,
}));

function handleConfig(x: number, y: number) {
  return {
    x,
    y,
    radius: 6,
    fill: "white",
    stroke: "#3b82f6",
    strokeWidth: 2,
    draggable: true,
  };
}

function onDragStart() {
  store.bringToFront(props.element.id);
}

function onDragEnd(e: any) {
  const dx = e.target.x();
  const dy = e.target.y();
  e.target.x(0);
  e.target.y(0);
  store.updateObject(props.element.id, {
    fields: {
      ...fields.value,
      x1: fields.value.x1 + dx,
      y1: fields.value.y1 + dy,
      x2: fields.value.x2 + dx,
      y2: fields.value.y2 + dy,
    },
  });
}

function onHandleDragMove(which: 1 | 2, e: any) {
  const updated =
    which === 1
      ? { x1: e.target.x(), y1: e.target.y() }
      : { x2: e.target.x(), y2: e.target.y() };
  store.updateObject(props.element.id, {
    fields: { ...fields.value, ...updated },
  }, false);
}

function onHandleDragEnd() {
  store.pushCurrentToHistory();
}
</script>

<template>
  <v-arrow
    :config="arrowConfig"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @transformend="store.pushCurrentToHistory()"
  />
  <template v-if="showHandles">
    <v-circle
      :config="handleConfig(fields.x1, fields.y1)"
      @dragmove="(e: any) => onHandleDragMove(1, e)"
      @dragend="onHandleDragEnd"
    />
    <v-circle
      :config="handleConfig(fields.x2, fields.y2)"
      @dragmove="(e: any) => onHandleDragMove(2, e)"
      @dragend="onHandleDragEnd"
    />
  </template>
</template>
