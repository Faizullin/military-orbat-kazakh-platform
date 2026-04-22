import type { InferRequestType, InferResponseType } from "hono/client";
import { api, ApiError } from "./client";

export type AiGenerateRequest = InferRequestType<
  typeof api.api.ai.generate.$post
>["json"];

export type AiGenerateResponse = Exclude<
  InferResponseType<typeof api.api.ai.generate.$post>,
  { error: string }
>;

export type AiImagePart = AiGenerateRequest["referenceImage"];
export type AiCanvasObject = AiGenerateResponse["objects"][number];

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function fileToImagePart(file: File | Blob): Promise<AiImagePart> {
  const dataUrl = await fileToDataUrl(file);
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  return {
    dataUrl,
    mediaType: file.type,
  };
}

export function useAiApi() {
  async function generate(input: AiGenerateRequest): Promise<AiGenerateResponse> {
    const res = await api.api.ai.generate.$post({ json: input });
    const data = await res.json();
    if ("error" in data) {
      throw new ApiError(res.status, String(data.error));
    }
    return data as AiGenerateResponse;
  }

  return { generate };
}
