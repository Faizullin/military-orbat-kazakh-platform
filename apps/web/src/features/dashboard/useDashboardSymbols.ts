import { computed, reactive, ref, watch } from "vue";
import {
  useSymbolsApi,
  type CreateSymbolInput,
  type RenderType,
  type ServerSymbolListItem,
  type UpdateSymbolInput,
} from "@/features/api/symbols";
import { DEFAULT_CONTENT } from "@/features/symbols/editor/types";
import type { CategoryOption } from "./categoryOptions";

export const ALL_SYMBOL_CATEGORIES = "__all__";
export type SymbolUploadAction = "thumbnail" | "attachment";
const DEFAULT_SYMBOL_CODE = JSON.stringify(DEFAULT_CONTENT);

export function useDashboardSymbols() {
  const {
    listSymbols,
    listCategories,
    createSymbol,
    updateSymbol,
    deleteSymbol,
    duplicateSymbol,
    uploadSymbolFile,
  } = useSymbolsApi();
  const symbols = ref<ServerSymbolListItem[]>([]);
  const categories = ref<string[]>([]);
  const selectedCategory = ref(ALL_SYMBOL_CATEGORIES);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const actionLoadingId = ref<string | null>(null);
  let requestId = 0;

  const filteredSymbols = computed(() => symbols.value);
  const categoryOptions = computed<CategoryOption[]>(() =>
    categories.value.map((category) => ({ label: category, value: category })),
  );

  const selectedCategoryQuery = computed(() =>
    selectedCategory.value === ALL_SYMBOL_CATEGORIES
      ? undefined
      : selectedCategory.value,
  );

  async function loadSymbols() {
    const currentRequestId = ++requestId;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const [nextSymbols, nextCategories] = await Promise.all([
        listSymbols(selectedCategoryQuery.value),
        listCategories(),
      ]);

      if (currentRequestId !== requestId) {
        return;
      }

      symbols.value = nextSymbols;
      categories.value = nextCategories;
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      errorMessage.value =
        error instanceof Error ? error.message : "Failed to load symbols";
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false;
      }
    }
  }

  const symbolDialogOpen = ref(false);
  const symbolDialogMode = ref<"create" | "edit">("create");
  const symbolDialogLoading = ref(false);
  const symbolDialogError = ref<string | null>(null);
  const editingSymbolId = ref<string | null>(null);
  const symbolForm = reactive({
    name: "",
    description: "",
    renderType: "FILE" as RenderType,
    category: "",
  });

  function resetSymbolForm() {
    symbolForm.name = "";
    symbolForm.description = "";
    symbolForm.renderType = "FILE";
    symbolForm.category = "";
    symbolDialogError.value = null;
    symbolDialogLoading.value = false;
    editingSymbolId.value = null;
  }

  function openCreateSymbolDialog() {
    resetSymbolForm();
    symbolDialogMode.value = "create";
    symbolDialogOpen.value = true;
  }

  function openEditSymbolDialog(symbol: ServerSymbolListItem) {
    resetSymbolForm();
    symbolDialogMode.value = "edit";
    symbolDialogOpen.value = true;
    editingSymbolId.value = symbol.id;
    symbolForm.name = symbol.name;
    symbolForm.description = symbol.description ?? "";
    symbolForm.renderType = (symbol.renderType as RenderType) ?? "FILE";
    symbolForm.category = symbol.category ?? "";
  }

  async function saveSymbolDialog() {
    symbolDialogLoading.value = true;
    symbolDialogError.value = null;

    try {
      if (symbolDialogMode.value === "create") {
        const input: CreateSymbolInput = {
          name: symbolForm.name,
          description: symbolForm.description || undefined,
          code: DEFAULT_SYMBOL_CODE,
          renderType: symbolForm.renderType,
          category: symbolForm.category || null,
        };
        await createSymbol(input);
      } else if (editingSymbolId.value) {
        const input: UpdateSymbolInput = {
          name: symbolForm.name,
          description: symbolForm.description || undefined,
          renderType: symbolForm.renderType,
          category: symbolForm.category || null,
        };
        await updateSymbol(editingSymbolId.value, input);
      }

      symbolDialogOpen.value = false;
      await loadSymbols();
    } catch (error) {
      symbolDialogError.value =
        error instanceof Error ? error.message : "Failed to save symbol";
    } finally {
      symbolDialogLoading.value = false;
    }
  }

  const uploadDialogOpen = ref(false);
  const uploadDialogLoading = ref(false);
  const uploadDialogError = ref<string | null>(null);
  const uploadTarget = ref<ServerSymbolListItem | null>(null);
  const uploadAction = ref<SymbolUploadAction>("thumbnail");
  const selectedFile = ref<File | null>(null);

  function openUploadDialog(symbol: ServerSymbolListItem, action: SymbolUploadAction) {
    uploadTarget.value = symbol;
    uploadAction.value = action;
    selectedFile.value = null;
    uploadDialogError.value = null;
    uploadDialogLoading.value = false;
    uploadDialogOpen.value = true;
  }

  function setUploadFile(file: File | null) {
    selectedFile.value = file;
  }

  async function submitUploadDialog() {
    if (!uploadTarget.value || !selectedFile.value) {
      return;
    }

    uploadDialogLoading.value = true;
    uploadDialogError.value = null;

    try {
      await uploadSymbolFile(uploadTarget.value.id, selectedFile.value, uploadAction.value);
      uploadDialogOpen.value = false;
      await loadSymbols();
    } catch (error) {
      uploadDialogError.value =
        error instanceof Error ? error.message : "Failed to upload file";
    } finally {
      uploadDialogLoading.value = false;
    }
  }

  async function duplicateDashboardSymbol(symbol: ServerSymbolListItem) {
    actionLoadingId.value = symbol.id;
    errorMessage.value = null;

    try {
      await duplicateSymbol(symbol.id);
      await loadSymbols();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Failed to duplicate symbol";
    } finally {
      actionLoadingId.value = null;
    }
  }

  const deleteDialogOpen = ref(false);
  const deleteDialogLoading = ref(false);
  const deletingSymbol = ref<ServerSymbolListItem | null>(null);

  function requestDeleteSymbol(symbol: ServerSymbolListItem) {
    deletingSymbol.value = symbol;
    deleteDialogOpen.value = true;
  }

  async function confirmDeleteSymbol() {
    if (!deletingSymbol.value) return;

    deleteDialogLoading.value = true;
    errorMessage.value = null;

    try {
      await deleteSymbol(deletingSymbol.value.id);
      deleteDialogOpen.value = false;
      deletingSymbol.value = null;
      await loadSymbols();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Failed to delete symbol";
    } finally {
      deleteDialogLoading.value = false;
    }
  }

  watch(selectedCategory, () => {
    void loadSymbols();
  });

  return {
    symbols,
    categories,
    categoryOptions,
    selectedCategory,
    filteredSymbols,
    isLoading,
    errorMessage,
    actionLoadingId,
    loadSymbols,
    symbolDialogOpen,
    symbolDialogMode,
    symbolDialogLoading,
    symbolDialogError,
    symbolForm,
    openCreateSymbolDialog,
    openEditSymbolDialog,
    saveSymbolDialog,
    uploadDialogOpen,
    uploadDialogLoading,
    uploadDialogError,
    uploadTarget,
    uploadAction,
    selectedFile,
    openUploadDialog,
    setUploadFile,
    submitUploadDialog,
    duplicateDashboardSymbol,
    deleteDialogOpen,
    deleteDialogLoading,
    deletingSymbol,
    requestDeleteSymbol,
    confirmDeleteSymbol,
  };
}
