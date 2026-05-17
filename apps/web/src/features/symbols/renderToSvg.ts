import type {
  ArcShapeFields,
  ArrowShapeFields,
  CanvasContent,
  CanvasObject,
  CircleShapeFields,
  LineShapeFields,
  PolygonShapeFields,
  RectShapeFields,
  ShapeFields,
  TextFields,
} from "./editor/types";
import { DEFAULT_CONTENT } from "./editor/types";

function parseContent(code: string): CanvasContent {
  try {
    const data = JSON.parse(code);
    if (data?.board && Array.isArray(data?.objects)) return data as CanvasContent;
  } catch {
    /* fall through */
  }
  return DEFAULT_CONTENT;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attrs(values: Record<string, unknown>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}="${esc(value)}"`)
    .join(" ");
}

function objectTransform(
  element: CanvasObject,
  includePosition = true,
): string | undefined {
  const transform = element.transform;
  const steps: string[] = [];
  if (includePosition && (transform.x || transform.y)) {
    steps.push(`translate(${transform.x ?? 0} ${transform.y ?? 0})`);
  }
  if (transform.rotation) steps.push(`rotate(${transform.rotation})`);
  if (transform.scaleX && transform.scaleX !== 1) {
    steps.push(`scale(${transform.scaleX} ${transform.scaleY ?? 1})`);
  } else if (transform.scaleY && transform.scaleY !== 1) {
    steps.push(`scale(1 ${transform.scaleY})`);
  }
  return steps.length ? steps.join(" ") : undefined;
}

function shapePaint(fields: ShapeFields, forceWhiteFill = false) {
  const fill = "fill" in fields ? (fields.fill ?? "none") : "none";
  return {
    fill: forceWhiteFill && fill !== "none" ? "#ffffff" : fill,
    stroke: forceWhiteFill && fields.stroke ? "#ffffff" : fields.stroke || undefined,
    "stroke-width": fields.strokeWidth,
    "stroke-linecap": "lineCap" in fields ? fields.lineCap : undefined,
    "stroke-dasharray":
      "dashArray" in fields && fields.dashArray?.length
        ? fields.dashArray.join(" ")
        : undefined,
    opacity: fields.opacity ?? 1,
  };
}

function renderRect(
  element: CanvasObject,
  fields: RectShapeFields,
  forceWhiteFill = false,
): string {
  return `<rect ${attrs({
    x: 0,
    y: 0,
    width: element.transform.width ?? 100,
    height: element.transform.height ?? 100,
    rx: fields.cornerRadius,
    transform: objectTransform(element),
    ...shapePaint(fields, forceWhiteFill),
  })}/>`;
}

function renderCircle(
  element: CanvasObject,
  fields: CircleShapeFields,
  forceWhiteFill = false,
): string {
  return `<circle ${attrs({
    cx: 0,
    cy: 0,
    r: fields.radius,
    transform: objectTransform(element),
    ...shapePaint(fields, forceWhiteFill),
  })}/>`;
}

function renderLine(
  element: CanvasObject,
  fields: LineShapeFields,
  forceWhiteFill = false,
): string {
  return `<line ${attrs({
    x1: fields.x1,
    y1: fields.y1,
    x2: fields.x2,
    y2: fields.y2,
    transform: objectTransform(element),
    ...shapePaint(fields, forceWhiteFill),
  })}/>`;
}

function arrowHeadPath(tipX: number, tipY: number, angle: number, size: number): string {
  const backX = tipX - Math.cos(angle) * size;
  const backY = tipY - Math.sin(angle) * size;
  const half = size / 2;
  const leftX = backX + Math.cos(angle + Math.PI / 2) * half;
  const leftY = backY + Math.sin(angle + Math.PI / 2) * half;
  const rightX = backX + Math.cos(angle - Math.PI / 2) * half;
  const rightY = backY + Math.sin(angle - Math.PI / 2) * half;
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function renderArrow(
  element: CanvasObject,
  fields: ArrowShapeFields,
  forceWhiteFill = false,
): string {
  const color = forceWhiteFill ? "#ffffff" : (fields.stroke ?? "#000000");
  const size = fields.arrowSize ?? 10;
  const angle = Math.atan2(fields.y2 - fields.y1, fields.x2 - fields.x1);
  const head = fields.arrowHead ?? "end";
  const line = `<line ${attrs({
    x1: fields.x1,
    y1: fields.y1,
    x2: fields.x2,
    y2: fields.y2,
    ...shapePaint({ ...fields, shapeType: "line" }, forceWhiteFill),
  })}/>`;
  const parts = [line];

  if (head === "end" || head === "both") {
    parts.push(
      `<polygon ${attrs({
        points: arrowHeadPath(fields.x2, fields.y2, angle, size),
        fill: color,
        opacity: fields.opacity ?? 1,
      })}/>`,
    );
  }
  if (head === "start" || head === "both") {
    parts.push(
      `<polygon ${attrs({
        points: arrowHeadPath(fields.x1, fields.y1, angle + Math.PI, size),
        fill: color,
        opacity: fields.opacity ?? 1,
      })}/>`,
    );
  }

  return `<g ${attrs({ transform: objectTransform(element) })}>${parts.join("")}</g>`;
}

function polar(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: radius * Math.cos(radians),
    y: radius * Math.sin(radians),
  };
}

function renderArc(
  element: CanvasObject,
  fields: ArcShapeFields,
  forceWhiteFill = false,
): string {
  const sweep = fields.endAngle - fields.startAngle;
  const start = polar(fields.radius, fields.startAngle);
  const end = polar(fields.radius, fields.endAngle);
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  const d = fields.closed
    ? `M 0 0 L ${start.x} ${start.y} A ${fields.radius} ${fields.radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y} Z`
    : `M ${start.x} ${start.y} A ${fields.radius} ${fields.radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;

  return `<path ${attrs({
    d,
    transform: objectTransform(element),
    ...shapePaint(
      {
        ...fields,
        fill: fields.closed ? (fields.fill ?? "#3b82f6") : "none",
      },
      forceWhiteFill,
    ),
  })}/>`;
}

function renderPolygon(
  element: CanvasObject,
  fields: PolygonShapeFields,
  forceWhiteFill = false,
): string {
  const tag = fields.closed === false ? "polyline" : "polygon";
  return `<${tag} ${attrs({
    points: fields.points.map((point) => `${point.x},${point.y}`).join(" "),
    transform: objectTransform(element),
    ...shapePaint(
      {
        ...fields,
        fill: fields.closed === false ? "none" : (fields.fill ?? "#3b82f6"),
      },
      forceWhiteFill,
    ),
  })}/>`;
}

function renderText(
  element: CanvasObject,
  fields: TextFields,
  forceWhiteFill = false,
): string {
  const width = element.transform.width ?? 200;
  const fontSize = fields.fontSize ?? 16;
  const lineHeight = fields.lineHeight ?? 1.2;
  const align = fields.textAlign ?? "left";
  const textAnchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const x = align === "center" ? width / 2 : align === "right" ? width : 0;
  const lines = fields.text.split(/\r?\n/);

  const tspans = lines
    .map(
      (line, index) =>
        `<tspan ${attrs({
          x,
          dy: index === 0 ? 0 : fontSize * lineHeight,
        })}>${esc(line)}</tspan>`,
    )
    .join("");

  return `<text ${attrs({
    transform: objectTransform(element),
    "font-family": fields.fontFamily ?? "Arial",
    "font-size": fontSize,
    "font-weight": fields.fontWeight,
    "font-style": fields.fontStyle,
    "text-decoration": fields.textDecoration,
    "letter-spacing": fields.letterSpacing,
    fill: forceWhiteFill ? "#ffffff" : (fields.color ?? "#000000"),
    "text-anchor": textAnchor,
    "dominant-baseline": "text-before-edge",
    "xml:space": "preserve",
  })}>${tspans}</text>`;
}

function renderObject(element: CanvasObject, forceWhiteFill = false): string {
  if (element.properties?.visible === false) return "";

  const fields = element.fields;
  if (fields._type === "text") return renderText(element, fields, forceWhiteFill);
  if (fields._type !== "shape") return "";

  switch (fields.shapeType) {
    case "rect":
      return renderRect(element, fields, forceWhiteFill);
    case "circle":
      return renderCircle(element, fields, forceWhiteFill);
    case "line":
      return renderLine(element, fields, forceWhiteFill);
    case "arrow":
      return renderArrow(element, fields, forceWhiteFill);
    case "arc":
      return renderArc(element, fields, forceWhiteFill);
    case "polygon":
      return renderPolygon(element, fields, forceWhiteFill);
  }
  return "";
}

export function renderContentToSvg(
  code: string,
  options: { background?: boolean; forceWhiteFill?: boolean } = {},
): Blob {
  const { forceWhiteFill = false } = options;
  const content = parseContent(code);
  const { width, height } = content.board.transform;
  const background = options.background
    ? `<rect ${attrs({
        x: 0,
        y: 0,
        width,
        height,
        fill: content.board.fields.backgroundColor ?? "#ffffff",
      })}/>`
    : "";
  const body = content.objects.map((o) => renderObject(o, forceWhiteFill)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${esc(width)}" height="${esc(height)}" viewBox="0 0 ${esc(width)} ${esc(height)}">${background}${body}</svg>`;

  return new Blob([svg], { type: "image/svg+xml" });
}
