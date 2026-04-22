<script setup lang="ts">
import { computed } from "vue";
import type { CanvasObject, ArcShapeFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";

const props = defineProps<{
  element: CanvasObject;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "select", evt: any): void;
}>();

const store = useSymbolEditorStore();
const fields = computed(() => props.element.fields as { _type: "shape" } & ArcShapeFields);
const transform = computed(() => props.element.transform);
const properties = computed(() => props.element.properties);

const config = computed(() => {
  const sweep = fields.value.endAngle - fields.value.startAngle;
  return {
    id: props.element.id,
    x: transform.value.x,
    y: transform.value.y,
    innerRadius: 0,
    outerRadius: fields.value.radius,
    angle: sweep,
    rotation: fields.value.startAngle,
    closed: fields.value.closed,
    fill: fields.value.closed ? (fields.value.fill ?? "#3b82f6") : undefined,
    stroke: fields.value.stroke ?? "#000000",
    strokeWidth: fields.value.strokeWidth ?? 2,
    opacity: fields.value.opacity ?? 1,
    draggable: !properties.value?.locked,
  };
});

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
    fields: { ...fields.value, radius: Math.max(2, fields.value.radius * scaleX) },
  });
}
</script>

<template>
  <v-arc
    :config="config"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
  />
</template>
