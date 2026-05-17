<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useSymbolEditorStore } from "./editorStore";
import { definitionForFields } from "./elementRegistry";
import CanvasContextMenu from "./CanvasContextMenu.vue";
import {
  SNAP_GUIDE_OFFSET,
  guideConfig,
  snapPointToGuides,
  type SnapGuide,
} from "./snapUtils";

const store = useSymbolEditorStore();

const stageRef = ref<any>(null);
const transformerRef = ref<any>(null);
const contextSelectionIds = ref<string[]>([]);
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

const GRID_SIZE = 50;

const snapGridConfigs = computed(() => {
  if (!store.snappingEnabled) return [];

  const { width, height } = store.content.board.transform;
  const configs: Array<Record<string, unknown>> = [];

  for (let x = GRID_SIZE; x < width; x += GRID_SIZE) {
    configs.push({
      points: [x, 0, x, height],
      stroke: x === width / 2 ? "#94a3b8" : "#cbd5e1",
      strokeWidth: x === width / 2 ? 1 : 0.75,
      dash: [3, 6],
      opacity: 0.7,
      listening: false,
    });
  }

  for (let y = GRID_SIZE; y < height; y += GRID_SIZE) {
    configs.push({
      points: [0, y, width, y],
      stroke: y === height / 2 ? "#94a3b8" : "#cbd5e1",
      strokeWidth: y === height / 2 ? 1 : 0.75,
      dash: [3, 6],
      opacity: 0.7,
      listening: false,
    });
  }

  return configs;
});

const snapGuideConfigs = computed(() =>
  store.snapGuides.map((guide) =>
    guideConfig(
      guide,
      store.content.board.transform.width,
      store.content.board.transform.height,
    ),
  ),
);

const transformerConfig = computed(() => ({
  resizeEnabled: true,
  rotateEnabled: true,
  rotationSnaps: store.snappingEnabled ? [0, 45, 90, 135, 180, 225, 270, 315] : [],
  rotationSnapTolerance: 8,
  enabledAnchors: [
    "top-left",
    "top-center",
    "top-right",
    "middle-right",
    "bottom-right",
    "bottom-center",
    "bottom-left",
    "middle-left",
  ],
  rotateAnchorOffset: 28,
  borderStroke: "#2563eb",
  borderStrokeWidth: 1.25,
  anchorFill: "#ffffff",
  anchorStroke: "#2563eb",
  anchorStrokeWidth: 1.5,
  anchorSize: 9,
  padding: 4,
  ignoreStroke: true,
  shouldOverdrawWholeArea: true,
  anchorDragBoundFunc: (_oldAbsPos: any, newAbsPos: any) => {
    if (!store.snappingEnabled) return newAbsPos;
    const snapped = snapPointToGuides(newAbsPos, store.content, store.selectedIds[0]);
    store.setSnapGuides(snapped.guides);
    return snapped.point;
  },
  boundBoxFunc: (oldBox: any, newBox: any) =>
    Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox,
}));

function isLineLike(id: string) {
  const object = store.content.objects.find((item) => item.id === id);
  const fields = object?.fields;
  return (
    fields?._type === "shape" &&
    (fields.shapeType === "line" || fields.shapeType === "arrow")
  );
}

const transformerSelectedIds = computed(() =>
  store.selectedIds.filter((id) => !isLineLike(id)),
);

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
    contextSelectionIds.value = store.selectedIds.slice();
    await nextTick();
    const tr = getKonvaNode(transformerRef.value);
    if (!tr) return;
    const nodes = transformerSelectedIds.value
      .map((id) => shapeRefs.get(id))
      .filter((n): n is any => !!n);
    tr.nodes(nodes);
    tr.forceUpdate?.();
    tr.getLayer()?.batchDraw();
  },
  { flush: "post" },
);

function resolveTargetId(e: any): string | null {
  const stage = getKonvaNode(stageRef.value);
  if (!stage) return null;
  if (e.target === stage) return null;

  let node = e.target;
  while (node && node !== stage) {
    if (node.className === "Transformer") return null;
    const parent = node.getParent?.();
    if (parent?.className === "Transformer") return null;
    const id = node.id?.();
    if (id) return id;
    node = parent;
  }
  return null;
}

function getLineGuideStops(skipNode: any) {
  const stage = getKonvaNode(stageRef.value);
  const board = store.content.board.transform;
  const vertical = [0, board.width / 2, board.width];
  const horizontal = [0, board.height / 2, board.height];

  shapeRefs.forEach((node) => {
    if (!stage || node === skipNode || node.hasName?.("endpoint-handle")) return;
    const box = node.getClientRect({ relativeTo: stage });
    vertical.push(box.x, box.x + box.width / 2, box.x + box.width);
    horizontal.push(box.y, box.y + box.height / 2, box.y + box.height);
  });

  return { vertical, horizontal };
}

function getObjectSnappingEdges(node: any) {
  const stage = getKonvaNode(stageRef.value);
  const box = stage ? node.getClientRect({ relativeTo: stage }) : node.getClientRect();
  const absPos = node.absolutePosition();

  return {
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absPos.x - box.x),
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absPos.x - box.x - box.width / 2),
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absPos.x - box.x - box.width),
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absPos.y - box.y),
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absPos.y - box.y - box.height / 2),
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absPos.y - box.y - box.height),
      },
    ],
  };
}

function getGuides(
  lineGuideStops: ReturnType<typeof getLineGuideStops>,
  itemBounds: any,
) {
  const resultV: Array<{ lineGuide: number; diff: number; offset: number }> = [];
  const resultH: Array<{ lineGuide: number; diff: number; offset: number }> = [];

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound: any) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < SNAP_GUIDE_OFFSET) {
        resultV.push({ lineGuide, diff, offset: itemBound.offset });
      }
    });
  });

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound: any) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < SNAP_GUIDE_OFFSET) {
        resultH.push({ lineGuide, diff, offset: itemBound.offset });
      }
    });
  });

  const guides: SnapGuide[] = [];
  const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0];

  if (minV) {
    guides.push({
      key: `v-${minV.lineGuide}`,
      orientation: "V",
      lineGuide: minV.lineGuide,
    });
  }
  if (minH) {
    guides.push({
      key: `h-${minH.lineGuide}`,
      orientation: "H",
      lineGuide: minH.lineGuide,
    });
  }

  return { guides, minV, minH };
}

function handleStageDragMove(e: any) {
  if (!store.snappingEnabled || e.target.hasName?.("endpoint-handle")) return;

  const id = resolveTargetId(e);
  if (!id) return;

  const lineGuideStops = getLineGuideStops(e.target);
  const itemBounds = getObjectSnappingEdges(e.target);
  const { guides, minV, minH } = getGuides(lineGuideStops, itemBounds);

  if (!guides.length) {
    store.clearSnapGuides();
    return;
  }

  const absPos = e.target.absolutePosition();
  if (minV) absPos.x = minV.lineGuide + minV.offset;
  if (minH) absPos.y = minH.lineGuide + minH.offset;
  e.target.absolutePosition(absPos);
  store.setSnapGuides(guides);
}

function handleStageDragEnd() {
  store.clearSnapGuides();
}

function handleStageClick(e: any) {
  if (typeof e.evt?.button === "number" && e.evt.button !== 0) return;

  const id = resolveTargetId(e);
  if (id === null) {
    if (e.target === getKonvaNode(stageRef.value)) store.setSelectedIds([]);
    return;
  }

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

function handleStageContextMenu(e: any) {
  const id = resolveTargetId(e);
  if (id === null) {
    store.setSelectedIds([]);
    contextSelectionIds.value = [];
    return;
  }

  if (!store.selectedIds.includes(id)) {
    store.setSelectedIds([id]);
    contextSelectionIds.value = [id];
    return;
  }

  contextSelectionIds.value = store.selectedIds.slice();
}

function getDefinition(fields: any) {
  return definitionForFields(fields);
}
</script>

<template>
  <CanvasContextMenu :selection-ids="contextSelectionIds">
    <div
      class="inline-block overflow-hidden rounded-sm bg-white shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
    >
      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @mousedown="handleStageClick"
        @touchstart="handleStageClick"
        @contextmenu="handleStageContextMenu"
        @dragmove="handleStageDragMove"
        @dragend="handleStageDragEnd"
      >
        <v-layer>
          <v-rect :config="boardConfig" />
          <v-line
            v-for="(gridLine, index) in snapGridConfigs"
            :key="`snap-grid-${index}`"
            :config="gridLine"
          />
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
          <v-line
            v-for="(guide, index) in snapGuideConfigs"
            :key="`${store.snapGuides[index]?.key}-${index}`"
            :config="guide"
          />
          <v-transformer
            v-show="transformerSelectedIds.length > 0"
            ref="transformerRef"
            :config="transformerConfig"
            @transformend="store.clearSnapGuides()"
          />
        </v-layer>
      </v-stage>
    </div>
  </CanvasContextMenu>
</template>
