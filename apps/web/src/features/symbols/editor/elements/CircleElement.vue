<script setup lang="ts">
import { computed } from "vue";
import type { CanvasObject, CircleShapeFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";

const props = defineProps<{
  element: CanvasObject;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", evt: any): void;
}>();

const store = useSymbolEditorStore();
const fields = computed(() => props.element.fields as { _type: "shape" } & CircleShapeFields);
const transform = computed(() => props.element.transform);
const properties = computed(() => props.element.properties);

const config = computed(() => ({
  id: props.element.id,
  x: transform.value.x,
  y: transform.value.y,
  radius: fields.value.radius,
  fill: fields.value.fill,
  stroke: fields.value.stroke ?? undefined,
  strokeWidth: fields.value.strokeWidth,
  rotation: transform.value.rotation,
  opacity: fields.value.opacity ?? 1,
  draggable: !properties.value?.locked,
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

function onTransformEnd(e: any) {
  const node = e.target;
  const scaleX = node.scaleX();
  node.scaleX(1);
  node.scaleY(1);
  store.updateObject(props.element.id, {
    transform: { ...transform.value, x: node.x(), y: node.y(), rotation: node.rotation() },
    fields: { ...fields.value, radius: Math.max(2, (fields.value.radius || 25) * scaleX) },
  });
}
</script>

<template>
  <v-circle
    :config="config"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
  />
</template>
