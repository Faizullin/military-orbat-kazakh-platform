import { Hono } from "hono";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { SymbolOutputSchema, AICanvasObjectSchema } from "../lib/ai/schema";
import { env } from "../lib/env";

const SYSTEM_PROMPT = `
You are an expert Russian Military Symbology Specialist that converts reference images into structured canvas-object JSON for a Konva-based editor.

OUTPUT CONTRACT:
- Return the "board" (width, height, optional backgroundColor) sized to fit the symbol with a small margin.
- Return an "objects" array of ordered canvas objects. Each object has:
  - type: "shape" or "text"
  - transform: { x, y, rotation?, scaleX?, scaleY?, width?, height? }
  - fields: a discriminated payload with _type ("text" or "shape") and a shapeType ("rect" | "circle" | "line" | "arrow" | "arc" | "polygon") for shapes.
- Do NOT return raw JavaScript code. The output is structured data.

ITERATION CONTEXT:
- You may receive the ORIGINAL reference image and optionally a SCREENSHOT of your previous output.
- When the screenshot is provided, COMPARE it against the reference image and IMPROVE the "objects" list.
- Refine contract: image #1 is the ORIGINAL reference; image #2 (when present) is the LATEST rendered output screenshot.
- Focus on: proportions, colors, line weights, text placement, missing elements.
- Each iteration should be BETTER than the last. Do NOT rebuild from scratch unless the previous attempt was fundamentally wrong.
- ORIENTATION IS A HARD CONSTRAINT: never mirror, flip, or rotate the symbol direction unless the user explicitly instructs it.
- Preserve left-right direction, curvature direction, and tick/marker orientation exactly as in the reference.
- In "description", explain what you saw and explicitly state whether orientation was preserved.

SYMBOL RULES (RUSSIAN TACTICAL):
1. Use Red (#FF0000) for hostile unit frames and text.
2. Frame: use a shape rect for the main unit boundary.
3. Icons: shape circle for tank/HQ dots; shape line segments for infantry 'X'; shape arc for curved elements.
4. Text: type "text" with "fields._type":"text" for labels like "3 мсп". Use Cyrillic characters directly — do not escape.

CONTROL FLAGS:
- Set "shouldContinue" true only if another refinement pass is needed.
- Set "shouldContinue" false when the output is close enough.
- If orientation is not preserved, set "shouldContinue" true and prioritize correcting orientation in the next pass.
`.trim();

const imagePartSchema = z.object({
  dataUrl: z.string().min(1).describe("data:image/...;base64,... URL"),
  mediaType: z.string().min(1).describe("MIME type, e.g. image/png"),
});

export const AI_PROVIDERS = ["google", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

const requestSchema = z.object({
  provider: z.enum(AI_PROVIDERS).describe("AI provider to use. Required."),
  referenceImage: imagePartSchema,
  previousRender: imagePartSchema.optional(),
  previousObjects: z.array(AICanvasObjectSchema).optional(),
  prompt: z.string().optional(),
});

function resolveModel(provider: AiProvider): LanguageModel {
  if (provider === "google") {
    const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }
    return createGoogleGenerativeAI({ apiKey })("gemini-3-flash-preview");
  }
  if (provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    return createAnthropic({ apiKey })("claude-sonnet-4-5");
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}

const ai = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  // POST /api/ai/generate
  // Body: { provider, referenceImage, previousRender?, previousObjects?, prompt? }
  // Returns structured canvas content (non-streaming).
  .post("/generate", zValidator("json", requestSchema), async (c) => {
    const body = c.req.valid("json");

    let model: LanguageModel;
    try {
      model = resolveModel(body.provider);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Provider not configured";
      return c.json({ error: message }, 500);
    }

    const isRefine = !!body.previousRender;
    const userText = isRefine
      ? [
          body.prompt?.trim() ||
            "Compare image #2 (your previous output) against image #1 (reference) and improve the objects list.",
          body.previousObjects
            ? `Previous objects JSON: ${JSON.stringify(body.previousObjects)}`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n\n")
      : body.prompt?.trim() ||
        "Analyze this image and produce structured Konva canvas objects that recreate it.";

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: URL | string; mimeType?: string }
    > = [{ type: "text", text: userText }];

    content.push({
      type: "image",
      image: body.referenceImage.dataUrl,
      mimeType: body.referenceImage.mediaType,
    });
    if (body.previousRender) {
      content.push({
        type: "image",
        image: body.previousRender.dataUrl,
        mimeType: body.previousRender.mediaType,
      });
    }

    try {
      const result = await generateObject({
        model,
        schema: SymbolOutputSchema,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });
      return c.json(result.object);
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI generation failed";
      console.error("AI generation error:", e);
      return c.json({ error: message }, 500);
    }
  });

export { ai };
