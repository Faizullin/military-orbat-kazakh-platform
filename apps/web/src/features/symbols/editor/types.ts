// Canvas content model. Stored as JSON in TopographicSymbol.code.

export type CanvasObjectType = "text" | "image" | "shape" | "milsymbol";

export interface CanvasObjectTransform {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  width?: number | null;
  height?: number | null;
}

export interface CanvasObjectStyle {
  backgroundColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: Record<string, unknown>;
}

export interface CanvasObjectProperties {
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  name?: string;
}

export interface TextFields {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  textDecoration?: string;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ImageFields {
  image_id: number;
}

export interface MilSymbolFields {
  sidc: string;
  size?: number;
  opacity?: number;
}

export interface ShapeBase {
  fill?: string;
  stroke?: string | null;
  strokeWidth?: number;
  opacity?: number;
}

export interface RectShapeFields extends ShapeBase {
  shapeType: "rect";
  cornerRadius?: number;
}

export interface CircleShapeFields extends ShapeBase {
  shapeType: "circle";
  radius: number;
}

export interface LineShapeFields extends ShapeBase {
  shapeType: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineCap?: "butt" | "round" | "square";
  dashArray?: number[];
}

export interface ArrowShapeFields extends ShapeBase {
  shapeType: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrowHead?: "end" | "start" | "both" | "none";
  arrowSize?: number;
  lineCap?: "butt" | "round" | "square";
  dashArray?: number[];
}

export interface ArcShapeFields extends ShapeBase {
  shapeType: "arc";
  radius: number;
  startAngle: number;
  endAngle: number;
  closed?: boolean;
}

export interface PolygonShapeFields extends ShapeBase {
  shapeType: "polygon";
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
}

export type ShapeFields =
  | RectShapeFields
  | CircleShapeFields
  | LineShapeFields
  | ArrowShapeFields
  | ArcShapeFields
  | PolygonShapeFields;

export type ShapeType = ShapeFields["shapeType"];

export type CanvasFields =
  | ({ _type: "text" } & TextFields)
  | ({ _type: "image" } & ImageFields)
  | ({ _type: "shape" } & ShapeFields)
  | ({ _type: "milsymbol" } & MilSymbolFields);

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  transform: CanvasObjectTransform;
  style?: CanvasObjectStyle;
  properties?: CanvasObjectProperties;
  fields: CanvasFields;
  metadata?: Record<string, unknown>;
}

export interface BoardTransform {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface BoardFields {
  backgroundColor?: string;
}

export interface BoardObject {
  id: "board";
  type: "board";
  transform: BoardTransform;
  fields: BoardFields;
}

export interface CanvasContent {
  version?: string;
  board: BoardObject;
  objects: CanvasObject[];
  metadata?: Record<string, unknown>;
}

export const DEFAULT_BOARD: BoardObject = {
  id: "board",
  type: "board",
  transform: { x: 0, y: 0, width: 800, height: 600 },
  fields: { backgroundColor: "#ffffff" },
};

export const DEFAULT_CONTENT: CanvasContent = {
  version: "1.0",
  board: DEFAULT_BOARD,
  objects: [],
};

export function getElementKey(fields: CanvasFields): string {
  return fields._type === "shape" ? `shape:${fields.shapeType}` : fields._type;
}
