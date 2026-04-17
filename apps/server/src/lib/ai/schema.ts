import { z } from "zod";
import {
  CanvasObjectTransformSchema,
  CanvasObjectStyleSchema,
  TextFieldsSchema,
  RectShapeFieldsSchema,
  CircleShapeFieldsSchema,
  LineShapeFieldsSchema,
  ArrowShapeFieldsSchema,
  ArcShapeFieldsSchema,
  PolygonShapeFieldsSchema,
} from "./canvas-types";

// ── AI-generatable canvas object fields (milsymbol excluded) ──────────────────
// milsymbol (SIDC) must be added manually — AI cannot guess correct SIDC codes.

const AICanvasFieldsSchema = z.union([
  z.object({ _type: z.literal("text") }).merge(TextFieldsSchema),
  RectShapeFieldsSchema.extend({ _type: z.literal("shape") }),
  CircleShapeFieldsSchema.extend({ _type: z.literal("shape") }),
  LineShapeFieldsSchema.extend({ _type: z.literal("shape") }),
  ArrowShapeFieldsSchema.extend({ _type: z.literal("shape") }),
  ArcShapeFieldsSchema.extend({ _type: z.literal("shape") }),
  PolygonShapeFieldsSchema.extend({ _type: z.literal("shape") }),
]);

export const AICanvasObjectSchema = z.object({
  type: z.enum(["text", "shape"]),
  transform: CanvasObjectTransformSchema,
  style: CanvasObjectStyleSchema.optional(),
  fields: AICanvasFieldsSchema,
});

export type AICanvasObject = z.infer<typeof AICanvasObjectSchema>;

// ── Tool output schema ────────────────────────────────────────────────────────

export const SymbolOutputSchema = z.object({
  description: z
    .string()
    .describe(
      "Brief description of the analyzed symbol and what changes were made in this iteration compared to the previous one.",
    ),
  code: z
    .string()
    .describe(
      "Vanilla Konva.js JavaScript code to recreate the symbol. Must use 'container', 'stage', and 'Konva' variables. No imports, no markdown.",
    ),
  shouldContinue: z
    .boolean()
    .describe(
      "Set true only if another refinement iteration is needed to better match the reference image. Set false when the result is already close enough.",
    ),
  changesSummary: z
    .string()
    .describe("What was changed/improved compared to the previous iteration. For the first iteration, describe what was created.")
    .optional(),
});

export type SymbolOutput = z.infer<typeof SymbolOutputSchema>;
