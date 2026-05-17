<script setup lang="ts">
import { computed, ref } from "vue";
import type { CanvasObject, LineShapeFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";
import { snapPointToGuides } from "../snapUtils";

const props = defineProps<{
  element: CanvasObject;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", evt: any): void;
}>();

const store = useSymbolEditorStore();
const shapeRef = ref<any>(null);
const fields = computed(
  () => props.element.fields as { _type: "shape" } & LineShapeFields,
);
const properties = computed(() => props.element.properties);

const showHandles = computed(
  () => props.isSelected && store.selectedIds.length === 1 && !properties.value?.locked,
);

const lineConfig = computed(() => ({
  id: props.element.id,
  x: 0,
  y: 0,
  points: [fields.value.x1, fields.value.y1, fields.value.x2, fields.value.y2],
  stroke: fields.value.stroke ?? "#000000",
  strokeWidth: fields.value.strokeWidth ?? 2,
  lineCap: fields.value.lineCap ?? "butt",
  dash: fields.value.dashArray,
  opacity: fields.value.opacity ?? 1,
  draggable: !properties.value?.locked,
  hitStrokeWidth: 12,
}));

defineExpose({
  getNode: () => shapeRef.value?.getNode?.() ?? null,
});

function handleConfig(x: number, y: number) {
  return {
    x,
    y,
    radius: 6,
    fill: "white",
    stroke: "#3b82f6",
    strokeWidth: 2,
    draggable: true,
    name: "endpoint-handle",
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
  store.clearSnapGuides();
}

function withAngleSnap(which: 1 | 2, point: { x: number; y: number }, e: any) {
  if (!e.evt?.shiftKey) return point;
  const anchor =
    which === 1
      ? { x: fields.value.x2, y: fields.value.y2 }
      : { x: fields.value.x1, y: fields.value.y1 };
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return point;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: anchor.x + Math.cos(snappedAngle) * length,
    y: anchor.y + Math.sin(snappedAngle) * length,
  };
}

function onHandleDragMove(which: 1 | 2, e: any) {
  e.cancelBubble = true;
  let point = withAngleSnap(which, { x: e.target.x(), y: e.target.y() }, e);
  if (store.snappingEnabled) {
    const snapped = snapPointToGuides(point, store.content, props.element.id);
    point = snapped.point;
    store.setSnapGuides(snapped.guides);
  }
  e.target.position(point);

  const updated =
    which === 1 ? { x1: point.x, y1: point.y } : { x2: point.x, y2: point.y };
  store.updateObject(
    props.element.id,
    {
      fields: { ...fields.value, ...updated },
    },
    false,
  );
}

function onHandleDragEnd(e: any) {
  e.cancelBubble = true;
  store.clearSnapGuides();
  store.pushCurrentToHistory();
}
</script>

<template>
  <v-line
    ref="shapeRef"
    :config="lineConfig"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
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
