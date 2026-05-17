import type { CanvasContent, CanvasObject, ShapeFields } from "./types";

export interface SnapGuide {
  key: string;
  orientation: "V" | "H";
  lineGuide: number;
}

export const SNAP_GUIDE_OFFSET = 6;

export function guideConfig(guide: SnapGuide, boardWidth: number, boardHeight: number) {
  return {
    points:
      guide.orientation === "H"
        ? [0, guide.lineGuide, boardWidth, guide.lineGuide]
        : [guide.lineGuide, 0, guide.lineGuide, boardHeight],
    stroke: "#0ea5e9",
    strokeWidth: 1,
    dash: [4, 6],
    listening: false,
  };
}

function objectStops(object: CanvasObject) {
  const transform = object.transform;
  const fields = object.fields;

  if (fields._type === "text") {
    const width = transform.width ?? 200;
    const height = (fields.fontSize ?? 16) * (fields.lineHeight ?? 1.2);
    return {
      vertical: [transform.x, transform.x + width / 2, transform.x + width],
      horizontal: [transform.y, transform.y + height / 2, transform.y + height],
    };
  }

  if (fields._type !== "shape") return { vertical: [], horizontal: [] };

  const shape = fields as ShapeFields;
  if (shape.shapeType === "rect") {
    const width = transform.width ?? 100;
    const height = transform.height ?? 100;
    return {
      vertical: [transform.x, transform.x + width / 2, transform.x + width],
      horizontal: [transform.y, transform.y + height / 2, transform.y + height],
    };
  }

  if (shape.shapeType === "circle" || shape.shapeType === "arc") {
    return {
      vertical: [transform.x - shape.radius, transform.x, transform.x + shape.radius],
      horizontal: [transform.y - shape.radius, transform.y, transform.y + shape.radius],
    };
  }

  if (shape.shapeType === "line" || shape.shapeType === "arrow") {
    return {
      vertical: [shape.x1, (shape.x1 + shape.x2) / 2, shape.x2],
      horizontal: [shape.y1, (shape.y1 + shape.y2) / 2, shape.y2],
    };
  }

  if (shape.shapeType === "polygon") {
    const xs = shape.points.map((point) => transform.x + point.x);
    const ys = shape.points.map((point) => transform.y + point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      vertical: [minX, (minX + maxX) / 2, maxX],
      horizontal: [minY, (minY + maxY) / 2, maxY],
    };
  }

  return { vertical: [], horizontal: [] };
}

export function getSnapStops(content: CanvasContent, skipId?: string) {
  const board = content.board.transform;
  const vertical = [0, board.width / 2, board.width];
  const horizontal = [0, board.height / 2, board.height];

  content.objects.forEach((object) => {
    if (object.id === skipId || object.properties?.visible === false) return;
    const stops = objectStops(object);
    vertical.push(...stops.vertical);
    horizontal.push(...stops.horizontal);
  });

  return { vertical, horizontal };
}

export function snapPointToGuides(
  point: { x: number; y: number },
  content: CanvasContent,
  skipId?: string,
  offset = SNAP_GUIDE_OFFSET,
) {
  const stops = getSnapStops(content, skipId);
  const next = { ...point };
  const guides: SnapGuide[] = [];

  const closestV = stops.vertical
    .map((lineGuide) => ({ lineGuide, diff: Math.abs(lineGuide - point.x) }))
    .filter((candidate) => candidate.diff < offset)
    .sort((a, b) => a.diff - b.diff)[0];
  const closestH = stops.horizontal
    .map((lineGuide) => ({ lineGuide, diff: Math.abs(lineGuide - point.y) }))
    .filter((candidate) => candidate.diff < offset)
    .sort((a, b) => a.diff - b.diff)[0];

  if (closestV) {
    next.x = closestV.lineGuide;
    guides.push({
      key: `v-${closestV.lineGuide}`,
      orientation: "V",
      lineGuide: closestV.lineGuide,
    });
  }
  if (closestH) {
    next.y = closestH.lineGuide;
    guides.push({
      key: `h-${closestH.lineGuide}`,
      orientation: "H",
      lineGuide: closestH.lineGuide,
    });
  }

  return { point: next, guides };
}
