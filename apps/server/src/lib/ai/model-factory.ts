import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { env } from "../env";

export const AI_PROVIDERS = ["google", "anthropic", "kimi"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

// Default model per provider
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  google:    "gemini-3-flash-preview",
  anthropic: "claude-sonnet-4-6",
  kimi:      "kimi-k2.6",
};

// All available models per provider (for request validation + frontend)
export const AVAILABLE_MODELS: Record<AiProvider, readonly string[]> = {
  google:    ["gemini-3-flash-preview", "gemini-3-pro-image-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-sonnet-4-20250514"],
  kimi:      ["kimi-k2.6", "moonshot-v1-8k-vision-preview"],
};

// Flat list of all model IDs (used in Zod schema)
export const ALL_MODEL_IDS = Object.values(AVAILABLE_MODELS).flat() as string[];

export function resolveModel(provider: AiProvider, model?: string): LanguageModel {
  const modelId = model ?? DEFAULT_MODELS[provider];

  if (provider === "google") {
    if (!env.GOOGLE_GENERATIVE_AI_API_KEY)
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    return createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(modelId);
  }

  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY)
      throw new Error("ANTHROPIC_API_KEY is not configured");
    return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(modelId);
  }

  if (provider === "kimi") {
    if (!env.MOONSHOT_API_KEY)
      throw new Error("MOONSHOT_API_KEY is not configured");
    return createOpenAICompatible({
      name: "kimi",
      baseURL: "https://api.moonshot.ai/v1",
      apiKey: env.MOONSHOT_API_KEY,
    }).chatModel(modelId);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
