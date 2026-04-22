import { onMounted, onUnmounted } from "vue";
import { useSymbolEditorStore } from "./editorStore";

export function useKeyboardShortcuts() {
  const store = useSymbolEditorStore();

  let arrowNudgeInProgress = false;

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const ids = store.selectedIds;

    if ((e.key === "Delete" || e.key === "Backspace") && ids.length > 0) {
      e.preventDefault();
      ids.slice().forEach((id) => store.deleteObject(id));
      return;
    }

    if (isCtrl && e.key === "c" && ids.length === 1) {
      store.copyObject(ids[0]);
      return;
    }

    if (isCtrl && e.key === "v") {
      store.pasteObject();
      return;
    }

    if (isCtrl && e.key === "d" && ids.length === 1) {
      e.preventDefault();
      store.duplicateObject(ids[0]);
      return;
    }

    if (isCtrl && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      store.undo();
      return;
    }

    if ((isCtrl && e.key === "y") || (isCtrl && e.shiftKey && e.key === "z")) {
      e.preventDefault();
      store.redo();
      return;
    }

    if (isCtrl && e.key === "s") {
      e.preventDefault();
      store.save();
      return;
    }

    if (e.key === "Escape") {
      store.setSelectedIds([]);
      return;
    }

    if (ids.length > 0 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      arrowNudgeInProgress = true;
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

      ids.forEach((id) => {
        const obj = store.content.objects.find((o) => o.id === id);
        if (!obj) return;
        store.updateObject(
          id,
          { transform: { ...obj.transform, x: obj.transform.x + dx, y: obj.transform.y + dy } },
          false,
        );
      });
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (
      arrowNudgeInProgress &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      arrowNudgeInProgress = false;
      store.pushCurrentToHistory();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });
}
