<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useSymbolsApi,
  type ServerSymbol,
  type ServerSymbolListItem,
  type CreateSymbolInput,
  type UpdateSymbolInput,
  type RenderType,
} from "@/features/api";
import { LANDING_PAGE_ROUTE } from "@/router/names";

// UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// Icons
import {
  PlusIcon,
  CopyIcon,
  Trash2Icon,
  PencilIcon,
  ArrowLeftIcon,
  ShapesIcon,
  UploadIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-vue-next";

const router = useRouter();
const {
  listSymbols,
  listCategories,
  getSymbol,
  createSymbol,
  updateSymbol,
  deleteSymbol,
  duplicateSymbol,
  uploadSymbolFile,
} = useSymbolsApi();

// ─── List state ──────────────────────────────────────────────
const items = ref<ServerSymbolListItem[]>([]);
const categories = ref<string[]>([]);
const selectedCategory = ref<string>("__all__");
const loading = ref(false);
const loadError = ref<string | null>(null);

const filteredItems = computed(() => {
  if (selectedCategory.value === "__all__") return items.value;
  return items.value.filter((s) => s.category === selectedCategory.value);
});

async function loadAll() {
  loading.value = true;
  loadError.value = null;
  try {
    const [syms, cats] = await Promise.all([listSymbols(), listCategories()]);
    items.value = syms;
    categories.value = cats;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : "Failed to load symbols";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

// ─── Create / Edit dialog ────────────────────────────────────
const dialogOpen = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const dialogLoading = ref(false);
const dialogError = ref<string | null>(null);
const editingId = ref<string | null>(null);

const form = reactive({
  name: "",
  description: "",
  code: "",
  renderType: "FILE" as RenderType,
  category: "",
});

function resetForm() {
  form.name = "";
  form.description = "";
  form.code = "";
  form.renderType = "FILE";
  form.category = "";
  dialogError.value = null;
  editingId.value = null;
}

function openCreate() {
  resetForm();
  dialogMode.value = "create";
  dialogOpen.value = true;
}

async function openEdit(item: ServerSymbolListItem) {
  resetForm();
  dialogMode.value = "edit";
  dialogLoading.value = true;
  dialogOpen.value = true;

  try {
    const full = await getSymbol(item.id);
    editingId.value = full.id;
    form.name = full.name;
    form.description = full.description ?? "";
    form.code = full.code ?? "";
    form.renderType = (full.renderType as RenderType) ?? "FILE";
    form.category = full.category ?? "";
  } catch (e) {
    dialogError.value =
      e instanceof Error ? e.message : "Failed to load symbol details";
  } finally {
    dialogLoading.value = false;
  }
}

async function handleDialogSubmit() {
  dialogError.value = null;
  dialogLoading.value = true;

  try {
    if (dialogMode.value === "create") {
      const input: CreateSymbolInput = {
        name: form.name,
        description: form.description || undefined,
        code: form.code,
        renderType: form.renderType,
        category: form.category || null,
      };
      await createSymbol(input);
    } else if (editingId.value) {
      const input: UpdateSymbolInput = {
        name: form.name,
        description: form.description || undefined,
        code: form.code,
        renderType: form.renderType,
        category: form.category || null,
      };
      await updateSymbol(editingId.value, input);
    }
    dialogOpen.value = false;
    await loadAll();
  } catch (e) {
    dialogError.value = e instanceof Error ? e.message : "Operation failed";
  } finally {
    dialogLoading.value = false;
  }
}

// ─── Upload ──────────────────────────────────────────────────
const uploadingId = ref<string | null>(null);
const uploadAction = ref<"thumbnail" | "attachment">("thumbnail");
const uploadDialogOpen = ref(false);
const uploadLoading = ref(false);
const uploadError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function openUpload(id: string, action: "thumbnail" | "attachment") {
  uploadingId.value = id;
  uploadAction.value = action;
  uploadError.value = null;
  uploadLoading.value = false;
  uploadDialogOpen.value = true;
}

async function handleUpload() {
  const file = fileInput.value?.files?.[0];
  if (!file || !uploadingId.value) return;

  uploadLoading.value = true;
  uploadError.value = null;
  try {
    await uploadSymbolFile(uploadingId.value, file, uploadAction.value);
    uploadDialogOpen.value = false;
    await loadAll();
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : "Upload failed";
  } finally {
    uploadLoading.value = false;
  }
}

// ─── Duplicate ───────────────────────────────────────────────
const actionLoading = ref<string | null>(null);

async function handleDuplicate(id: string) {
  actionLoading.value = id;
  try {
    await duplicateSymbol(id);
    await loadAll();
  } catch {
    // Silently fail — grid will just not update
  } finally {
    actionLoading.value = null;
  }
}

// ─── Delete ──────────────────────────────────────────────────
const deleteConfirmOpen = ref(false);
const deletingItem = ref<ServerSymbolListItem | null>(null);
const deleteLoading = ref(false);

function openDeleteConfirm(item: ServerSymbolListItem) {
  deletingItem.value = item;
  deleteConfirmOpen.value = true;
}

async function handleDelete() {
  if (!deletingItem.value) return;
  deleteLoading.value = true;
  try {
    await deleteSymbol(deletingItem.value.id);
    deleteConfirmOpen.value = false;
    deletingItem.value = null;
    await loadAll();
  } catch {
    // Keep dialog open on failure
  } finally {
    deleteLoading.value = false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function thumbUrl(s: ServerSymbolListItem) {
  return s.thumbnail?.url ?? s.attachment?.url ?? "";
}
</script>

<template>
  <div class="bg-background flex min-h-screen flex-col">
    <!-- Header -->
    <header
      class="bg-muted/40 sticky top-0 z-10 border-b px-4 py-3 sm:px-6"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            @click="router.push({ name: LANDING_PAGE_ROUTE })"
            title="Back to home"
          >
            <ArrowLeftIcon class="size-5" />
          </Button>
          <div>
            <h1 class="text-lg font-semibold">Symbol Library</h1>
            <p class="text-muted-foreground text-sm">
              Manage your custom server symbols
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Category filter -->
          <Select v-model="selectedCategory">
            <SelectTrigger class="w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              <SelectItem
                v-for="cat in categories"
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" @click="loadAll" title="Refresh">
            <RefreshCwIcon class="size-4" />
          </Button>

          <Button @click="openCreate">
            <PlusIcon class="mr-1 size-4" />
            New Symbol
          </Button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <Loader2Icon class="text-muted-foreground size-8 animate-spin" />
      </div>

      <!-- Error -->
      <Alert v-else-if="loadError" variant="destructive" class="mx-auto max-w-lg">
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>

      <!-- Empty state -->
      <Empty
        v-else-if="filteredItems.length === 0 && !loading"
        class="mx-auto mt-16 max-w-sm border border-dashed"
      >
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShapesIcon />
          </EmptyMedia>
          <EmptyTitle>
            {{
              selectedCategory !== "__all__"
                ? "No symbols in this category"
                : "No symbols yet"
            }}
          </EmptyTitle>
          <EmptyDescription>
            {{
              selectedCategory !== "__all__"
                ? "Try selecting a different category or create a new symbol."
                : "Create your first custom symbol to get started."
            }}
          </EmptyDescription>
        </EmptyHeader>
        <Button @click="openCreate" class="mt-4">
          <PlusIcon class="mr-1 size-4" />
          Create Symbol
        </Button>
      </Empty>

      <!-- Symbol grid -->
      <div
        v-else
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        <Card
          v-for="s in filteredItems"
          :key="s.id"
          class="group relative overflow-hidden transition-shadow hover:shadow-md"
        >
          <CardContent class="flex flex-col items-center p-4">
            <!-- Thumbnail -->
            <div
              class="bg-muted flex h-24 w-24 items-center justify-center rounded"
            >
              <img
                v-if="thumbUrl(s)"
                :src="thumbUrl(s)"
                :alt="s.name"
                class="h-full w-full object-contain"
              />
              <ShapesIcon v-else class="text-muted-foreground size-10" />
            </div>

            <!-- Info -->
            <p class="mt-2 text-center text-sm font-medium leading-tight break-words">
              {{ s.name }}
            </p>
            <Badge v-if="s.category" variant="secondary" class="mt-1 text-xs">
              {{ s.category }}
            </Badge>

            <!-- Card hover actions -->
            <div
              class="mt-3 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                title="Edit"
                @click="openEdit(s)"
              >
                <PencilIcon class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                title="Upload thumbnail"
                @click="openUpload(s.id, 'thumbnail')"
              >
                <UploadIcon class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                title="Duplicate"
                :disabled="actionLoading === s.id"
                @click="handleDuplicate(s.id)"
              >
                <CopyIcon class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-7 text-destructive"
                title="Delete"
                @click="openDeleteConfirm(s)"
              >
                <Trash2Icon class="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>

    <!-- ─── Create / Edit Dialog ──────────────────────────────── -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {{ dialogMode === "create" ? "New Symbol" : "Edit Symbol" }}
          </DialogTitle>
          <DialogDescription>
            {{
              dialogMode === "create"
                ? "Fill in the details to create a new custom symbol."
                : "Update the symbol details below."
            }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4 py-2" @submit.prevent="handleDialogSubmit">
          <Alert v-if="dialogError" variant="destructive">
            <AlertDescription>{{ dialogError }}</AlertDescription>
          </Alert>

          <div class="grid gap-2">
            <Label for="sym-name">Name</Label>
            <Input
              id="sym-name"
              v-model="form.name"
              placeholder="e.g. Custom Infantry"
              required
            />
          </div>

          <div class="grid gap-2">
            <Label for="sym-description">Description</Label>
            <Input
              id="sym-description"
              v-model="form.description"
              placeholder="Optional description"
            />
          </div>

          <div class="grid gap-2">
            <Label for="sym-category">Category</Label>
            <Input
              id="sym-category"
              v-model="form.category"
              placeholder="e.g. NATO, custom"
            />
          </div>

          <div class="grid gap-2">
            <Label for="sym-renderType">Render Type</Label>
            <Select v-model="form.renderType">
              <SelectTrigger id="sym-renderType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FILE">File</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label for="sym-code">Symbol Code</Label>
            <Textarea
              id="sym-code"
              v-model="form.code"
              rows="6"
              placeholder="SVG or symbol definition code"
              class="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="dialogOpen = false"
            >
              Cancel
            </Button>
            <Button type="submit" :disabled="dialogLoading || !form.name">
              <Loader2Icon
                v-if="dialogLoading"
                class="mr-1 size-4 animate-spin"
              />
              {{ dialogMode === "create" ? "Create" : "Save" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ─── Upload Dialog ─────────────────────────────────────── -->
    <Dialog v-model:open="uploadDialogOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Upload {{ uploadAction === "thumbnail" ? "Thumbnail" : "Attachment" }}
          </DialogTitle>
          <DialogDescription>
            Select an image file to upload.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-2">
          <Alert v-if="uploadError" variant="destructive">
            <AlertDescription>{{ uploadError }}</AlertDescription>
          </Alert>
          <Input
            ref="fileInput"
            type="file"
            accept="image/*,.svg"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="uploadDialogOpen = false"
          >
            Cancel
          </Button>
          <Button :disabled="uploadLoading" @click="handleUpload">
            <Loader2Icon
              v-if="uploadLoading"
              class="mr-1 size-4 animate-spin"
            />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete Confirmation Dialog ────────────────────────── -->
    <Dialog v-model:open="deleteConfirmOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Symbol</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete
            <strong>{{ deletingItem?.name }}</strong
            >? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteConfirmOpen = false">
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="deleteLoading"
            @click="handleDelete"
          >
            <Loader2Icon
              v-if="deleteLoading"
              class="mr-1 size-4 animate-spin"
            />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
