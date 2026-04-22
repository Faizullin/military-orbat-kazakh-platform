<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, SparklesIcon, UploadIcon, XIcon } from "lucide-vue-next";
import {
  fileToImagePart,
  useAiApi,
  type AiGenerateRequest,
  type AiGenerateResponse,
  type AiImagePart,
} from "@/features/api/ai";
import { renderContentToPng } from "../renderToPng";
import { useSymbolEditorStore } from "./editorStore";
import type { CanvasContent } from "./types";

type AiProvider = AiGenerateRequest["provider"];

const AUTO_REFINE_LIMIT = 3;

const PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string }> = [
  { value: "google", label: "Google - Gemini 3 Flash Preview" },
  { value: "anthropic", label: "Anthropic - Claude Sonnet 4.5" },
];

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const openModel = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const { generate } = useAiApi();
const store = useSymbolEditorStore();

const referencePreview = ref<string | null>(null);
const referencePart = ref<AiImagePart | null>(null);
const isReferenceDragging = ref(false);

const provider = ref<AiProvider>("google");
const prompt = ref("");
const isGenerating = ref(false);
const errorMessage = ref<string | null>(null);
const result = ref<AiGenerateResponse | null>(null);
const iteration = ref(0);
const lastRenderDataUrl = ref<string | null>(null);
const autoRefine = ref(false);
const isAutoLooping = ref(false);

const fileInputRef = ref<HTMLInputElement | null>(null);

function resetResult() {
  result.value = null;
  iteration.value = 0;
  lastRenderDataUrl.value = null;
  errorMessage.value = null;
}

function resetReferenceFile() {
  referencePreview.value = null;
  referencePart.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
}

async function setReferenceFile(file: File) {
  resetResult();

  try {
    const imagePart = await fileToImagePart(file);
    referencePart.value = imagePart;
    referencePreview.value = imagePart.dataUrl;
  } catch (error) {
    resetReferenceFile();
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to read image";
  }
}

async function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await setReferenceFile(file);
}

function openFilePicker() {
  if (!fileInputRef.value) return;
  fileInputRef.value.value = "";
  fileInputRef.value.click();
}

function onReferenceDrop(event: DragEvent) {
  isReferenceDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  void setReferenceFile(file);
}

function onReferenceDragLeave(event: DragEvent) {
  const target = event.currentTarget as HTMLElement | null;
  const next = event.relatedTarget as Node | null;
  if (!target || !next || !target.contains(next)) {
    isReferenceDragging.value = false;
  }
}

function clearFile() {
  resetReferenceFile();
  resetResult();
}

function resultToCanvasContent(response: AiGenerateResponse): CanvasContent {
  return {
    version: "1.0",
    board: {
      id: "board",
      type: "board",
      transform: {
        x: 0,
        y: 0,
        width: response.board.width,
        height: response.board.height,
      },
      fields: { backgroundColor: response.board.backgroundColor ?? "#ffffff" },
    },
    objects: response.objects.map((object, index) => ({
      id: `ai-${iteration.value}-${index}`,
      type: object.type,
      transform: object.transform,
      style: object.style,
      fields: object.fields,
    })) as CanvasContent["objects"],
  };
}

async function renderResultToImagePart(
  response: AiGenerateResponse,
): Promise<AiImagePart> {
  const content = resultToCanvasContent(response);
  const blob = await renderContentToPng(
    JSON.stringify(content),
    response.board.width,
    response.board.height,
    1,
    true,
  );
  return fileToImagePart(blob);
}

async function runOnce(refine: boolean): Promise<AiGenerateResponse | null> {
  if (!referencePart.value) return null;

  let previousRender: AiImagePart | undefined;
  let previousObjects: AiGenerateResponse["objects"] | undefined;
  if (refine && result.value) {
    previousRender = await renderResultToImagePart(result.value);
    lastRenderDataUrl.value = previousRender.dataUrl;
    previousObjects = result.value.objects;
  }

  const response = await generate({
    provider: provider.value,
    referenceImage: referencePart.value,
    previousRender,
    previousObjects,
    prompt: prompt.value.trim() || undefined,
  });

  result.value = response;
  iteration.value += 1;
  return response;
}

async function runGenerate(refine: boolean) {
  if (!referencePart.value) return;

  isGenerating.value = true;
  errorMessage.value = null;
  try {
    const first = await runOnce(refine);
    if (!first || !autoRefine.value) return;

    isAutoLooping.value = true;
    let current = first;
    let passes = 1;
    while (
      current.shouldContinue &&
      passes < AUTO_REFINE_LIMIT &&
      referencePart.value
    ) {
      const next = await runOnce(true);
      if (!next) break;
      current = next;
      passes += 1;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Generation failed";
  } finally {
    isAutoLooping.value = false;
    isGenerating.value = false;
  }
}

function onApply() {
  if (!result.value) return;
  store.applyCanvasContent(resultToCanvasContent(result.value));
  openModel.value = false;
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      clearFile();
      prompt.value = "";
      isReferenceDragging.value = false;
    }
  },
);
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent
      class="sm:max-w-2xl"
      @dragover.prevent
      @drop.prevent
    >
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <SparklesIcon class="size-4" />
          AI symbol from reference
        </DialogTitle>
        <DialogDescription class="sr-only">
          Generate canvas objects from a reference image.
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Provider</label>
          <Select v-model="provider">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in PROVIDER_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <label class="mt-2 text-sm font-medium">Reference</label>
          <div
            role="button"
            tabindex="0"
            class="relative flex min-h-44 cursor-pointer items-center justify-center overflow-hidden rounded-md border transition-colors"
            :class="[
              referencePreview ? 'border-solid bg-background' : 'border-dashed bg-muted/30',
              isReferenceDragging ? 'border-primary bg-primary/10' : '',
            ]"
            @click="openFilePicker"
            @keydown.enter.prevent="openFilePicker"
            @keydown.space.prevent="openFilePicker"
            @dragenter.stop.prevent="isReferenceDragging = true"
            @dragover.stop.prevent="isReferenceDragging = true"
            @dragleave.prevent="onReferenceDragLeave"
            @drop.stop.prevent="onReferenceDrop"
          >
            <img
              v-if="referencePreview"
              :src="referencePreview"
              class="max-h-56 w-full object-contain p-2"
              alt="Reference"
            />
            <div
              v-else
              class="text-muted-foreground flex flex-col items-center gap-2 p-6 text-sm"
            >
              <UploadIcon class="size-5" />
              <span>Drop image or browse</span>
            </div>
            <button
              v-if="referencePreview"
              type="button"
              class="bg-background/80 absolute top-1 right-1 rounded-full p-1"
              title="Remove"
              @click.stop="clearFile()"
            >
              <XIcon class="size-4" />
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="sr-only"
              @change="onPickFile"
            />
          </div>

          <label class="mt-2 text-sm font-medium">Prompt</label>
          <Textarea
            v-model="prompt"
            rows="3"
            placeholder="Optional instructions"
          />

          <label class="mt-2 flex items-center gap-2 text-sm">
            <Checkbox v-model="autoRefine" :disabled="isGenerating" />
            Auto-refine
          </label>

          <div class="flex items-center gap-2">
            <Button
              :disabled="!referencePart || isGenerating"
              @click="runGenerate(false)"
            >
              <Loader2Icon
                v-if="isGenerating && !result"
                class="mr-1 size-4 animate-spin"
              />
              <SparklesIcon v-else class="mr-1 size-4" />
              Generate
            </Button>
            <Button
              v-if="result"
              variant="secondary"
              :disabled="isGenerating"
              @click="runGenerate(true)"
            >
              <Loader2Icon
                v-if="isGenerating"
                class="mr-1 size-4 animate-spin"
              />
              Refine #{{ iteration + 1 }}
            </Button>
          </div>

          <p v-if="isAutoLooping" class="text-muted-foreground text-xs">
            Refining...
          </p>
          <p v-if="errorMessage" class="text-destructive text-xs">
            {{ errorMessage }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Result</label>
          <div
            class="bg-muted/30 max-h-80 min-h-40 overflow-y-auto rounded-md border p-3 text-xs"
          >
            <div
              v-if="!result"
              class="text-muted-foreground flex h-full items-center justify-center"
            >
              No result
            </div>
            <div v-else class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">Iteration {{ iteration }}</span>
                <span
                  class="rounded px-1.5 py-0.5"
                  :class="
                    result.shouldContinue
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-900'
                  "
                >
                  {{ result.shouldContinue ? "refine" : "ready" }}
                </span>
              </div>

              <p class="whitespace-pre-wrap">{{ result.description }}</p>
              <p v-if="result.changesSummary" class="whitespace-pre-wrap">
                {{ result.changesSummary }}
              </p>

              <div class="font-medium">
                {{ result.board.width }} x {{ result.board.height }} -
                {{ result.objects.length }} objects
              </div>

              <details>
                <summary class="cursor-pointer font-medium">JSON</summary>
                <pre class="mt-1 max-h-40 overflow-auto text-[10px]">{{
                  JSON.stringify(result, null, 2)
                }}</pre>
              </details>

              <details v-if="lastRenderDataUrl">
                <summary class="cursor-pointer font-medium">
                  Previous render
                </summary>
                <img
                  :src="lastRenderDataUrl"
                  class="mt-1 max-h-40 object-contain"
                  alt="Previous render"
                />
              </details>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="openModel = false">Close</Button>
        <Button :disabled="!result" @click="onApply">Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
