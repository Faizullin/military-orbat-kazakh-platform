<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Loader2Icon, PlusIcon, RefreshCwIcon, ShapesIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CategoryCombobox from "./CategoryCombobox.vue";
import SymbolsDataTable from "./SymbolsDataTable.vue";
import {
  ALL_SYMBOL_CATEGORIES,
  useDashboardSymbols,
} from "./useDashboardSymbols";
import { SYMBOL_EDITOR_ROUTE } from "@/router/names";
import type { ServerSymbolListItem } from "@/features/api/symbols";

const router = useRouter();
const {
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
} = useDashboardSymbols();

onMounted(loadSymbols);

async function handleViewSymbol(symbol: ServerSymbolListItem) {
  await router.push({ name: SYMBOL_EDITOR_ROUTE, params: { id: symbol.id } });
}

function handleUploadFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  setUploadFile(input.files?.[0] ?? null);
}

const uploadAccept = computed(() =>
  uploadAction.value === "thumbnail"
    ? "image/png,image/jpeg,image/webp"
    : "image/svg+xml,image/png,image/jpeg,image/webp",
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="border-b px-6 py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <ShapesIcon class="text-muted-foreground size-5" />
            <h1 class="text-2xl font-semibold tracking-tight">
              Topographical symbols
            </h1>
            <Badge variant="secondary">{{ filteredSymbols.length }}</Badge>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            Server symbol library, grouped by category.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Select v-model="selectedCategory">
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_SYMBOL_CATEGORIES">All categories</SelectItem>
              <SelectItem v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            type="button"
            :disabled="isLoading"
            @click="loadSymbols"
          >
            <RefreshCwIcon class="size-4" :class="{ 'animate-spin': isLoading }" />
            Refresh
          </Button>
          <Button type="button" @click="openCreateSymbolDialog">
            <PlusIcon class="size-4" />
            New symbol
          </Button>
        </div>
      </div>
    </header>

    <section class="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div class="flex h-full min-h-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <div v-if="isLoading" class="flex h-full w-full items-center justify-center">
          <RefreshCwIcon class="text-muted-foreground size-8 animate-spin" />
        </div>
        <SymbolsDataTable
          v-else-if="filteredSymbols.length"
          :symbols="filteredSymbols"
          :action-loading-id="actionLoadingId"
          @view="handleViewSymbol"
          @edit="openEditSymbolDialog"
          @upload-thumbnail="openUploadDialog($event, 'thumbnail')"
          @upload-attachment="openUploadDialog($event, 'attachment')"
          @duplicate="duplicateDashboardSymbol"
          @delete="requestDeleteSymbol"
        />
        <div
          v-else
          class="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm"
        >
          <span>No symbols found.</span>
          <Button type="button" size="sm" @click="openCreateSymbolDialog">
            <PlusIcon class="size-4" />
            Create symbol
          </Button>
        </div>
      </div>
    </section>

    <Dialog v-model:open="symbolDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {{ symbolDialogMode === "create" ? "New symbol" : "Edit symbol" }}
          </DialogTitle>
          <DialogDescription>
            {{
              symbolDialogMode === "create"
                ? "Create a topographical symbol entry."
                : "Update the symbol metadata."
            }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4 py-2" @submit.prevent="saveSymbolDialog">
          <Alert v-if="symbolDialogError" variant="destructive">
            <AlertDescription>{{ symbolDialogError }}</AlertDescription>
          </Alert>

          <div class="grid gap-2">
            <Label for="dashboard-symbol-name">Name</Label>
            <Input
              id="dashboard-symbol-name"
              v-model="symbolForm.name"
              required
              placeholder="e.g. Ridge line"
            />
          </div>

          <div class="grid gap-2">
            <Label for="dashboard-symbol-description">Description</Label>
            <Input
              id="dashboard-symbol-description"
              v-model="symbolForm.description"
              placeholder="Optional description"
            />
          </div>

          <div class="grid gap-2">
            <Label for="dashboard-symbol-category">Category</Label>
            <CategoryCombobox
              id="dashboard-symbol-category"
              v-model="symbolForm.category"
              :categories="categoryOptions"
              placeholder="Select or add category"
            />
          </div>

          <div class="grid gap-2">
            <Label for="dashboard-symbol-render-type">Render type</Label>
            <Select v-model="symbolForm.renderType">
              <SelectTrigger id="dashboard-symbol-render-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FILE">File</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="symbolDialogOpen = false"
            >
              Cancel
            </Button>
            <Button type="submit" :disabled="symbolDialogLoading || !symbolForm.name">
              <Loader2Icon
                v-if="symbolDialogLoading"
                class="mr-1 size-4 animate-spin"
              />
              {{ symbolDialogMode === "create" ? "Create" : "Save" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="uploadDialogOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Upload {{ uploadAction === "thumbnail" ? "thumbnail" : "symbol file" }}
          </DialogTitle>
          <DialogDescription>
            {{ uploadTarget?.name }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-2">
          <Alert v-if="uploadDialogError" variant="destructive">
            <AlertDescription>{{ uploadDialogError }}</AlertDescription>
          </Alert>
          <Input
            type="file"
            :accept="uploadAccept"
            @change="handleUploadFileChange"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="uploadDialogOpen = false">
            Cancel
          </Button>
          <Button
            type="button"
            :disabled="uploadDialogLoading || !selectedFile"
            @click="submitUploadDialog"
          >
            <Loader2Icon
              v-if="uploadDialogLoading"
              class="mr-1 size-4 animate-spin"
            />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete symbol</DialogTitle>
          <DialogDescription>
            Delete <strong>{{ deletingSymbol?.name }}</strong
            >? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="deleteDialogOpen = false">
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleteDialogLoading"
            @click="confirmDeleteSymbol"
          >
            <Loader2Icon
              v-if="deleteDialogLoading"
              class="mr-1 size-4 animate-spin"
            />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
