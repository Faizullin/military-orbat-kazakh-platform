<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useSymbolEditorStore } from "./editorStore";
import { definitionForFields } from "./elementRegistry";

const store = useSymbolEditorStore();

const stageRef = ref<any>(null);
const transformerRef = ref<any>(null);
const shapeRefs = new Map<string, any>();

const stageConfig = computed(() => ({
  width: store.content.board.transform.width,
  height: store.content.board.transform.height,
}));

const boardConfig = computed(() => ({
  x: 0,
  y: 0,
  width: store.content.board.transform.width,
  height: store.content.board.transform.height,
  fill: store.content.board.fields.backgroundColor ?? "#ffffff",
  listening: false,
}));

const transformerConfig = {
  boundBoxFunc: (oldBox: any, newBox: any) =>
    Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox,
};

function getKonvaNode(componentRef: any): any | null {
  if (!componentRef) return null;
  if (typeof componentRef.getNode === "function") return componentRef.getNode();
  if (componentRef.getStage) return componentRef.getStage();
  return null;
}

function attachShapeRef(id: string, vueRef: any) {
  const node = getKonvaNode(vueRef);
  if (node) {
    shapeRefs.set(id, node);
  } else {
    shapeRefs.delete(id);
  }
}

watch(
  () => [store.selectedIds.slice(), store.content.objects.length],
  async () => {
    await nextTick();
    const tr = getKonvaNode(transformerRef.value);
    if (!tr) return;
    const nodes = store.selectedIds
      .map((id) => shapeRefs.get(id))
      .filter((n): n is any => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  },
  { flush: "post" },
);

function handleStageClick(e: any) {
  const stage = getKonvaNode(stageRef.value);
  if (!stage) return;
  const clickedOnEmpty = e.target === stage;
  if (clickedOnEmpty) {
    store.setSelectedIds([]);
    return;
  }
  const targetParent = e.target.getParent?.();
  if (targetParent?.className === "Transformer") return;

  const id = e.target.id();
  if (!id) return;

  const isShift = e.evt?.shiftKey;
  if (isShift) {
    if (store.selectedIds.includes(id)) {
      store.setSelectedIds(store.selectedIds.filter((sid) => sid !== id));
    } else {
      store.setSelectedIds([...store.selectedIds, id]);
    }
  } else if (!store.selectedIds.includes(id)) {
    store.setSelectedIds([id]);
  }
}

function onTransformerEnd() {
  store.pushCurrentToHistory();
}

function getDefinition(fields: any) {
  return definitionForFields(fields);
}
</script>

<template>
  <div class="bg-slate-50 dark:bg-slate-900 inline-block overflow-hidden shadow-inner">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStageClick"
      @touchstart="handleStageClick"
    >
      <v-layer>
        <v-rect :config="boardConfig" />
        <template v-for="el in store.content.objects" :key="el.id">
          <component
            :is="getDefinition(el.fields)?.canvasElement"
            v-if="getDefinition(el.fields)"
            :ref="(r: any) => attachShapeRef(el.id, r)"
            :element="el"
            :is-selected="store.selectedIds.includes(el.id)"
            @select="handleStageClick"
          />
        </template>
        <v-transformer
          v-show="store.selectedIds.length > 0"
          ref="transformerRef"
          :config="transformerConfig"
          @transformend="onTransformerEnd"
        />
      </v-layer>
    </v-stage>
  </div>
</template>
