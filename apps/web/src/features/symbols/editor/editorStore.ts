import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import { nanoid } from "nanoid";
import { klona } from "klona";
import { useSymbolsApi } from "@/features/api/symbols";
import { renderContentToPng } from "../renderToPng";
import { renderContentToSvg } from "../renderToSvg";
import {
  type CanvasContent,
  type CanvasObject,
  type CanvasFields,
  DEFAULT_CONTENT,
} from "./types";

const HISTORY_LIMIT = 100;

export const useSymbolEditorStore = defineStore("symbolEditor", () => {
  const symbolsApi = useSymbolsApi();

  const content = ref<CanvasContent>(klona(DEFAULT_CONTENT));
  const selectedIds = ref<string[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isConverting = ref(false);
  const isDirty = ref(false);
  const symbolId = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);

  // History (shallow refs — entries are full snapshots, never mutated in place)
  const history = shallowRef<CanvasContent[]>([klona(DEFAULT_CONTENT)]);
  const historyIndex = ref(0);

  // Single-slot clipboard
  const clipboard = ref<Omit<CanvasObject, "id"> | null>(null);

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  function pushHistory(snapshot: CanvasContent) {
    const trimmed = history.value.slice(0, historyIndex.value + 1);
    trimmed.push(klona(snapshot));
    if (trimmed.length > HISTORY_LIMIT) {
      trimmed.splice(0, trimmed.length - HISTORY_LIMIT);
    }
    history.value = trimmed;
    historyIndex.value = trimmed.length - 1;
    isDirty.value = true;
  }

  function pushCurrentToHistory() {
    pushHistory(content.value);
  }

  function setSelectedIds(ids: string[]) {
    selectedIds.value = ids;
  }

  function loadFromCode(id: string, code: string | null | undefined) {
    symbolId.value = id;
    selectedIds.value = [];
    errorMessage.value = null;

    let parsed: CanvasContent | null = null;
    if (code) {
      try {
        const data = JSON.parse(code);
        if (data?.board && Array.isArray(data?.objects)) {
          parsed = data as CanvasContent;
        }
      } catch (e) {
        console.error("Failed to parse symbol code:", e);
      }
    }
    const next = parsed ?? klona(DEFAULT_CONTENT);
    content.value = next;
    history.value = [klona(next)];
    historyIndex.value = 0;
    isDirty.value = false;
  }

  function applyCanvasContent(next: CanvasContent) {
    content.value = klona(next);
    selectedIds.value = [];
    pushCurrentToHistory();
  }

  function reset() {
    symbolId.value = null;
    selectedIds.value = [];
    content.value = klona(DEFAULT_CONTENT);
    history.value = [klona(DEFAULT_CONTENT)];
    historyIndex.value = 0;
    clipboard.value = null;
    errorMessage.value = null;
    isDirty.value = false;
  }

  function addObject(base: Omit<CanvasObject, "id">) {
    const obj: CanvasObject = { ...klona(base), id: nanoid(7) };
    content.value = { ...content.value, objects: [...content.value.objects, obj] };
    selectedIds.value = [obj.id];
    pushCurrentToHistory();
  }

  function updateObject(
    id: string,
    updates: Partial<CanvasObject>,
    pushToHistory = true,
  ) {
    content.value = {
      ...content.value,
      objects: content.value.objects.map((obj) => {
        if (obj.id !== id) return obj;
        const next: CanvasObject = { ...obj, ...updates };
        if (updates.transform)
          next.transform = { ...obj.transform, ...updates.transform };
        if (updates.fields)
          next.fields = { ...obj.fields, ...updates.fields } as CanvasFields;
        if (updates.properties)
          next.properties = { ...obj.properties, ...updates.properties };
        return next;
      }),
    };
    if (pushToHistory) pushCurrentToHistory();
  }

  function updateBoard(
    updates: Partial<{ width: number; height: number; backgroundColor: string }>,
  ) {
    const board = content.value.board;
    content.value = {
      ...content.value,
      board: {
        ...board,
        transform: {
          ...board.transform,
          width: updates.width ?? board.transform.width,
          height: updates.height ?? board.transform.height,
        },
        fields: {
          ...board.fields,
          backgroundColor: updates.backgroundColor ?? board.fields.backgroundColor,
        },
      },
    };
    pushCurrentToHistory();
  }

  function deleteObject(id: string) {
    content.value = {
      ...content.value,
      objects: content.value.objects.filter((obj) => obj.id !== id),
    };
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id);
    pushCurrentToHistory();
  }

  function copyObject(id: string) {
    const obj = content.value.objects.find((o) => o.id === id);
    if (!obj) return;
    const { id: _drop, ...rest } = obj;
    clipboard.value = klona(rest);
  }

  function pasteObject() {
    if (!clipboard.value) return;
    const c = clipboard.value;
    const pasted: CanvasObject = {
      ...klona(c),
      id: nanoid(7),
      transform: { ...c.transform, x: c.transform.x + 10, y: c.transform.y + 10 },
    };
    clipboard.value = {
      ...c,
      transform: { ...c.transform, x: c.transform.x + 10, y: c.transform.y + 10 },
    };
    content.value = { ...content.value, objects: [...content.value.objects, pasted] };
    selectedIds.value = [pasted.id];
    pushCurrentToHistory();
  }

  function duplicateObject(id: string) {
    const obj = content.value.objects.find((o) => o.id === id);
    if (!obj) return;
    const dup: CanvasObject = {
      ...klona(obj),
      id: nanoid(7),
      transform: { ...obj.transform, x: obj.transform.x + 10, y: obj.transform.y + 10 },
    };
    content.value = { ...content.value, objects: [...content.value.objects, dup] };
    selectedIds.value = [dup.id];
    pushCurrentToHistory();
  }

  function bringToFront(id: string) {
    const obj = content.value.objects.find((o) => o.id === id);
    if (!obj) return;
    const others = content.value.objects.filter((o) => o.id !== id);
    content.value = { ...content.value, objects: [...others, obj] };
  }

  function sendToBack(id: string) {
    const obj = content.value.objects.find((o) => o.id === id);
    if (!obj) return;
    const others = content.value.objects.filter((o) => o.id !== id);
    content.value = { ...content.value, objects: [obj, ...others] };
  }

  function undo() {
    if (!canUndo.value) return;
    historyIndex.value -= 1;
    content.value = klona(history.value[historyIndex.value]);
    selectedIds.value = [];
    isDirty.value = historyIndex.value !== 0;
  }

  function redo() {
    if (!canRedo.value) return;
    historyIndex.value += 1;
    content.value = klona(history.value[historyIndex.value]);
    selectedIds.value = [];
    isDirty.value = true;
  }

  async function save() {
    if (!symbolId.value) return;
    isSaving.value = true;
    errorMessage.value = null;
    try {
      await symbolsApi.updateSymbol(symbolId.value, {
        code: JSON.stringify(content.value),
        renderType: "EDITOR",
      });
      isDirty.value = false;
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : "Save failed";
      throw e;
    } finally {
      isSaving.value = false;
    }
  }

  async function convert() {
    if (!symbolId.value) return;
    isConverting.value = true;
    errorMessage.value = null;
    try {
      if (isDirty.value) await save();
      const code = JSON.stringify(content.value);
      const [thumbBlob, attBlob] = await Promise.all([
        renderContentToPng(code, 128, 128, 1, false),
        Promise.resolve(renderContentToSvg(code)),
      ]);
      await symbolsApi.convertSymbol(symbolId.value, {
        thumbnail: thumbBlob,
        attachment: attBlob,
        thumbnailName: "thumbnail.png",
        attachmentName: "attachment.svg",
        thumbnailType: "image/png",
        attachmentType: "image/svg+xml",
      });
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : "Convert failed";
      throw e;
    } finally {
      isConverting.value = false;
    }
  }

  const selectedObjects = computed(() =>
    content.value.objects.filter((o) => selectedIds.value.includes(o.id)),
  );

  const singleSelected = computed(() =>
    selectedObjects.value.length === 1 ? selectedObjects.value[0] : null,
  );

  return {
    // state
    content,
    selectedIds,
    selectedObjects,
    singleSelected,
    isLoading,
    isSaving,
    isConverting,
    isDirty,
    symbolId,
    errorMessage,
    clipboard,
    canUndo,
    canRedo,
    // actions
    setSelectedIds,
    loadFromCode,
    applyCanvasContent,
    reset,
    addObject,
    updateObject,
    updateBoard,
    deleteObject,
    copyObject,
    pasteObject,
    duplicateObject,
    bringToFront,
    sendToBack,
    undo,
    redo,
    save,
    convert,
    pushCurrentToHistory,
  };
});
