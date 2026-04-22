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

export const AIBoardSchema = z.object({
  width: z.number().min(50).max(4096).describe("Canvas board width in pixels"),
  height: z.number().min(50).max(4096).describe("Canvas board height in pixels"),
  backgroundColor: z
    .string()
    .optional()
    .describe("Optional board background color (hex). Omit for transparent."),
});

// ── AI structured output schema ───────────────────────────────────────────────

export const SymbolOutputSchema = z.object({
  description: z
    .string()
    .describe(
      "Brief description of the analyzed symbol and what changes were made in this iteration compared to the previous one.",
    ),
  board: AIBoardSchema.describe("Board dimensions and optional background color"),
  objects: z
    .array(AICanvasObjectSchema)
    .describe(
      "Ordered list of canvas objects that recreate the reference symbol. Order matters — later objects render on top.",
    ),
  shouldContinue: z
    .boolean()
    .describe(
      "Set true only if another refinement iteration is needed to better match the reference image. Set false when the result is already close enough.",
    ),
  changesSummary: z
    .string()
    .optional()
    .describe(
      "What was changed/improved compared to the previous iteration. For the first iteration, describe what was created.",
    ),
});

export type SymbolOutput = z.infer<typeof SymbolOutputSchema>;
