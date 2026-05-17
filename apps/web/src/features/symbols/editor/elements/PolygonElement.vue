<script setup lang="ts">
import { computed, ref } from "vue";
import type { CanvasObject, PolygonShapeFields } from "../types";
import { useSymbolEditorStore } from "../editorStore";

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
  () => props.element.fields as { _type: "shape" } & PolygonShapeFields,
);
const transform = computed(() => props.element.transform);
const properties = computed(() => props.element.properties);

const config = computed(() => {
  const flat = fields.value.points.flatMap((p) => [p.x, p.y]);
  return {
    id: props.element.id,
    x: transform.value.x,
    y: transform.value.y,
    rotation: transform.value.rotation ?? 0,
    scaleX: transform.value.scaleX ?? 1,
    scaleY: transform.value.scaleY ?? 1,
    points: flat,
    closed: fields.value.closed ?? true,
    fill: fields.value.closed !== false ? (fields.value.fill ?? "#3b82f6") : undefined,
    stroke: fields.value.stroke ?? "#000000",
    strokeWidth: fields.value.strokeWidth ?? 2,
    opacity: fields.value.opacity ?? 1,
    draggable: !properties.value?.locked,
    hitStrokeWidth: 12,
  };
});

defineExpose({
  getNode: () => shapeRef.value?.getNode?.() ?? null,
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
  store.updateObject(props.element.id, {
    transform: {
      ...transform.value,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    },
  });
}
</script>

<template>
  <v-line
    ref="shapeRef"
    :config="config"
    @click="emit('select', $event)"
    @tap="emit('select', $event)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
  />
</template>
