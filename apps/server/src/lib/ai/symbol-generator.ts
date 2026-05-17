import * as aiSdk from "ai";
import { wrapAISDK, createLangSmithProviderOptions } from "../tracing/langsmith";
import { resolveModel, DEFAULT_MODELS, type AiProvider } from "./model-factory";
import { calcCost, type UsageRecord } from "./token-tracker";

const { generateText } = wrapAISDK(aiSdk);

// ── Helpers ────────────────────────────────────────────────────────────────

function extractCode(raw: string): string {
  const m = raw.match(/```(?:javascript|js|typescript|ts)?\n?([\s\S]*?)```/);
  return (m ? m[1] : raw).trim();
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(b64, "base64");
}

function getPngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function getJpegSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3)
      return { w: buf.readUInt16BE(offset + 7), h: buf.readUInt16BE(offset + 5) };
    offset += 2 + length;
  }
  return null;
}

function getImageSize(buf: Buffer): { w: number; h: number } {
  return getPngSize(buf) ?? getJpegSize(buf) ?? { w: 0, h: 0 };
}

// ── Prompts ────────────────────────────────────────────────────────────────

export const GENERATE_SYSTEM = `\
You are a Konva.js code generator specialized in Russian military symbology. Given a reference image of a military symbol, output JavaScript that faithfully recreates it on the provided Konva stage.

Rules:
- Three variables are already in scope: Konva, stage (500×600 px, already configured), layer (already added to stage).
- Output ONLY executable JavaScript. No imports, no exports, no markdown fences, no explanations.
- Use vanilla Konva primitives: Konva.Rect, Konva.Path, Konva.Line, Konva.Circle, Konva.Arc, Konva.RegularPolygon, Konva.Text, Konva.Group.
- Do NOT use Konva.Arrow. Military symbols with pointed sides are geometric outlines, not semantic arrow icons.
- Build the observed geometry from simple shapes, lines, polygons, circles, rectangles, arcs, groups, or SVG path-data.
- Prefer Konva.Path with SVG path-data for irregular, hollow, outlined, or complex military outlines.
- End with layer.draw().

Direction & geometry:
- Preserve the EXACT orientation — never mirror, flip, or rotate.
- Treat every pointed or directional shape as raw geometry, not an arrow primitive.
- Match the outline, proportions, dividers, gaps, and interior lines precisely.
- Analyse the shape carefully before writing coordinates.

Fill vs stroke:
- If an outline, frame, or border appears hollow/empty inside: use fill: 'transparent' (not a colour fill).
- Only use a solid fill color when the interior is visibly painted in the reference.

Colors & military conventions:
- Use #FF0000 for hostile (red) frames and labels.
- Match observed colors exactly — do not invent colors not present in the reference.

Scale & positioning:
- The stage is 500×600 px. Scale the symbol to fill ~80% of the board with even margins.
- Compute: scale = Math.min(500 / SOURCE_W, 600 / SOURCE_H) * 0.8, then center at x = (500 - SOURCE_W * scale) / 2, y = (600 - SOURCE_H * scale) / 2.`;

export const REFINE_SYSTEM = `\
You are a Konva.js code generator for Russian military symbology. Improve the provided code to better reproduce the reference symbol.
Same rules: executable JavaScript only, no markdown fences, Konva/stage/layer in scope, no Konva.Arrow, use Path for complex shapes, end with layer.draw().
Pay special attention to: exact orientation, outline geometry, fill vs hollow, interior/divider lines, proportions, colors.`;

export function generateUserMsg(srcW: number, srcH: number, prompt?: string): string {
  return `Canvas: 500×600 px. Source image: ${srcW}×${srcH} px. ` +
    `Scale the symbol to fill ~80% of the canvas and center it. ` +
    `Preserve exact orientation. Do not use Konva.Arrow; construct geometry with Path, Line, Rect, Circle, Arc, RegularPolygon, Group, or Text. ` +
    `Use fill:'transparent' if the shape interior is empty. ` +
    (prompt?.trim() ? `Additional instruction: ${prompt.trim()}. ` : "") +
    `Output only JavaScript.`;
}

export function refineUserMsg(code: string, prompt?: string): string {
  const note = prompt?.trim() ? `\n\nAdditional instruction: ${prompt.trim()}` : "";
  return `The rendered output (second image) does not match the reference symbol (first image) closely enough. Improve the code.${note}\n\nCurrent code:\n${code}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type ImagePart = { dataUrl: string; mediaType: string };

export type GenerateInput = {
  provider:       AiProvider;
  model?:         string;
  referenceImage: ImagePart;
  prompt?:        string;
};

export type RefineInput = {
  provider:        AiProvider;
  model?:          string;
  referenceImage:  ImagePart;
  previousRender:  ImagePart;
  previousCode:    string;
  prompt?:         string;
};

export type GenerateOutput = {
  code:        string;
  rawResponse: string;
  usage:       UsageRecord;
};

// ── Generator ─────────────────────────────────────────────────────────────

export class SymbolGenerator {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const modelId        = input.model ?? DEFAULT_MODELS[input.provider];
    const srcBuf         = dataUrlToBuffer(input.referenceImage.dataUrl);
    const { w: srcW, h: srcH } = getImageSize(srcBuf);

    const result = await generateText({
      model:   resolveModel(input.provider, input.model),
      system:  GENERATE_SYSTEM,
      messages: [{
        role:    "user",
        content: [
          { type: "image", image: input.referenceImage.dataUrl },
          { type: "text",  text:  generateUserMsg(srcW, srcH, input.prompt) },
        ],
      }],
      providerOptions: {
        langsmith: createLangSmithProviderOptions<typeof aiSdk.generateText>({
          name:     "generate_symbol",
          metadata: { step: "generate", provider: input.provider, model: modelId, srcW, srcH },
        }),
      },
    });

    const inp = result.usage?.inputTokens  ?? (result.usage as any)?.promptTokens     ?? 0;
    const out = result.usage?.outputTokens ?? (result.usage as any)?.completionTokens ?? 0;
    return {
      code:        extractCode(result.text),
      rawResponse: result.text,
      usage:       { model: modelId, inputTokens: inp, outputTokens: out, costUsd: calcCost(modelId, inp, out) },
    };
  }

  async refine(input: RefineInput): Promise<GenerateOutput> {
    const modelId = input.model ?? DEFAULT_MODELS[input.provider];

    const result = await generateText({
      model:   resolveModel(input.provider, input.model),
      system:  REFINE_SYSTEM,
      messages: [{
        role:    "user",
        content: [
          { type: "image", image: input.referenceImage.dataUrl },
          { type: "image", image: input.previousRender.dataUrl },
          { type: "text",  text:  refineUserMsg(input.previousCode, input.prompt) },
        ],
      }],
      providerOptions: {
        langsmith: createLangSmithProviderOptions<typeof aiSdk.generateText>({
          name:     "refine_symbol",
          metadata: { step: "refine", provider: input.provider, model: modelId },
        }),
      },
    });

    const inp = result.usage?.inputTokens  ?? (result.usage as any)?.promptTokens     ?? 0;
    const out = result.usage?.outputTokens ?? (result.usage as any)?.completionTokens ?? 0;
    return {
      code:        extractCode(result.text),
      rawResponse: result.text,
      usage:       { model: modelId, inputTokens: inp, outputTokens: out, costUsd: calcCost(modelId, inp, out) },
    };
  }
}
