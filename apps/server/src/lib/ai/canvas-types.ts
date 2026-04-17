import { z } from "zod";

// ============================================================
// Canvas Zod schemas for Konva shape types
// Ported from military-mapper-nextjs canvas.types.ts
// ============================================================

export const CanvasObjectTransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional().default(0),
  scaleX: z.number().optional().default(1),
  scaleY: z.number().optional().default(1),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export const CanvasObjectStyleSchema = z.object({
  backgroundColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  borderWidth: z.number().optional().default(0),
  borderRadius: z.number().optional().default(0),
  opacity: z.number().optional().default(1),
  shadow: z.record(z.string(), z.unknown()).optional(),
});

export const ShapeBaseSchema = z.object({
  fill: z.string().optional().default("#3b82f6"),
  stroke: z.string().nullable().optional(),
  strokeWidth: z.number().optional().default(1),
  opacity: z.number().optional().default(1),
});

export const RectShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("rect"),
  cornerRadius: z.number().optional().default(0),
});

export const CircleShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("circle"),
  radius: z.number(),
});

export const LineShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  lineCap: z.enum(["butt", "round", "square"]).optional().default("butt"),
  dashArray: z.array(z.number()).optional(),
});

export const ArrowShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("arrow"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  arrowHead: z.enum(["end", "start", "both", "none"]).optional().default("end"),
  arrowSize: z.number().optional().default(10),
  lineCap: z.enum(["butt", "round", "square"]).optional().default("butt"),
  dashArray: z.array(z.number()).optional(),
});

export const ArcShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("arc"),
  radius: z.number().min(1),
  startAngle: z.number(),
  endAngle: z.number(),
  closed: z.boolean().optional().default(false),
});

export const PolygonShapeFieldsSchema = ShapeBaseSchema.extend({
  shapeType: z.literal("polygon"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  closed: z.boolean().optional().default(true),
});

export const TextFieldsSchema = z.object({
  text: z.string(),
  fontFamily: z.string().optional().default("Arial"),
  fontSize: z.number().optional().default(16),
  fontWeight: z.string().optional().default("normal"),
  fontStyle: z.string().optional().default("normal"),
  textAlign: z.string().optional().default("left"),
  textDecoration: z.string().optional().default("none"),
  color: z.string().optional().default("#000000"),
  lineHeight: z.number().optional().default(1.2),
  letterSpacing: z.number().optional().default(0),
});
