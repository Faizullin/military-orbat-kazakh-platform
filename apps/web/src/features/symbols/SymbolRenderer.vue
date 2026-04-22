<script setup lang="ts">
import { computed, ref } from "vue";
import {
  type CanvasContent,
  type CanvasObject,
  DEFAULT_CONTENT,
} from "./editor/types";
import { definitionForFields } from "./editor/elementRegistry";

const props = withDefaults(
  defineProps<{
    code: string | null | undefined;
    width?: number;
    height?: number;
    background?: boolean;
  }>(),
  { width: 96, height: 96, background: false },
);

const stageRef = ref<any>(null);
defineExpose({
  getStage: () => {
    const r = stageRef.value;
    if (!r) return null;
    return typeof r.getNode === "function" ? r.getNode() : r.getStage?.() ?? null;
  },
});

const parsed = computed<CanvasContent>(() => {
  if (!props.code) return DEFAULT_CONTENT;
  try {
    const data = JSON.parse(props.code);
    if (data?.board && Array.isArray(data?.objects)) return data as CanvasContent;
  } catch {
    /* fall through */
  }
  return DEFAULT_CONTENT;
});

const board = computed(() => parsed.value.board.transform);
const fit = computed(() => {
  const sx = props.width / Math.max(1, board.value.width);
  const sy = props.height / Math.max(1, board.value.height);
  const scale = Math.min(sx, sy);
  return {
    scale,
    offsetX: (props.width - board.value.width * scale) / 2,
    offsetY: (props.height - board.value.height * scale) / 2,
  };
});

const stageConfig = computed(() => ({
  width: props.width,
  height: props.height,
  scaleX: fit.value.scale,
  scaleY: fit.value.scale,
  x: fit.value.offsetX,
  y: fit.value.offsetY,
  listening: false,
}));

const boardConfig = computed(() => ({
  x: 0,
  y: 0,
  width: board.value.width,
  height: board.value.height,
  fill: parsed.value.board.fields.backgroundColor ?? "#ffffff",
  listening: false,
}));

function definitionFor(el: CanvasObject) {
  return definitionForFields(el.fields);
}
</script>

<template>
  <v-stage ref="stageRef" :config="stageConfig">
    <v-layer>
      <v-rect v-if="props.background" :config="boardConfig" />
      <template v-for="el in parsed.objects" :key="el.id">
        <component
          :is="definitionFor(el)?.canvasElement"
          v-if="definitionFor(el)"
          :element="el"
          :is-selected="false"
        />
      </template>
    </v-layer>
  </v-stage>
</template>
