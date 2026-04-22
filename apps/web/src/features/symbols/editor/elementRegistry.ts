import type { Component } from "vue";
import type { FunctionalComponent } from "vue";
import type { CanvasFields, CanvasObject } from "./types";
import { getElementKey } from "./types";

import RectElement from "./elements/RectElement.vue";
import RectProperties from "./elements/RectProperties.vue";
import CircleElement from "./elements/CircleElement.vue";
import CircleProperties from "./elements/CircleProperties.vue";
import LineElement from "./elements/LineElement.vue";
import LineProperties from "./elements/LineProperties.vue";
import ArrowElement from "./elements/ArrowElement.vue";
import ArrowProperties from "./elements/ArrowProperties.vue";
import ArcElement from "./elements/ArcElement.vue";
import ArcProperties from "./elements/ArcProperties.vue";
import PolygonElement from "./elements/PolygonElement.vue";
import PolygonProperties from "./elements/PolygonProperties.vue";
import TextElement from "./elements/TextElement.vue";
import TextProperties from "./elements/TextProperties.vue";

import {
  Square,
  Circle as CircleIcon,
  Minus,
  MoveRight,
  PieChart,
  Pentagon,
  Type,
} from "lucide-vue-next";

export interface ElementDefinition {
  label: string;
  icon: Component | FunctionalComponent;
  canvasElement: Component;
  propertiesFields: Component;
  createDefault: () => Omit<CanvasObject, "id">;
}

export const elementRegistry: Record<string, ElementDefinition> = {
  "shape:rect": {
    label: "Rectangle",
    icon: Square,
    canvasElement: RectElement,
    propertiesFields: RectProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 250, y: 250, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "rect",
        fill: "#3b82f6",
        stroke: "#000000",
        strokeWidth: 2,
        cornerRadius: 0,
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  "shape:circle": {
    label: "Circle",
    icon: CircleIcon,
    canvasElement: CircleElement,
    propertiesFields: CircleProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 300, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "circle",
        radius: 50,
        fill: "#ef4444",
        stroke: "#000000",
        strokeWidth: 2,
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  "shape:line": {
    label: "Line",
    icon: Minus,
    canvasElement: LineElement,
    propertiesFields: LineProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "line",
        x1: 200,
        y1: 250,
        x2: 400,
        y2: 250,
        stroke: "#000000",
        strokeWidth: 2,
        lineCap: "butt",
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  "shape:arrow": {
    label: "Arrow",
    icon: MoveRight,
    canvasElement: ArrowElement,
    propertiesFields: ArrowProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "arrow",
        x1: 200,
        y1: 270,
        x2: 400,
        y2: 270,
        arrowHead: "end",
        arrowSize: 10,
        stroke: "#000000",
        strokeWidth: 2,
        lineCap: "butt",
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  "shape:arc": {
    label: "Arc",
    icon: PieChart,
    canvasElement: ArcElement,
    propertiesFields: ArcProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 300, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "arc",
        radius: 80,
        startAngle: 0,
        endAngle: 270,
        closed: false,
        fill: "#3b82f6",
        stroke: "#000000",
        strokeWidth: 2,
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  "shape:polygon": {
    label: "Polygon",
    icon: Pentagon,
    canvasElement: PolygonElement,
    propertiesFields: PolygonProperties,
    createDefault: () => ({
      type: "shape",
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "shape",
        shapeType: "polygon",
        points: [
          { x: 300, y: 200 },
          { x: 400, y: 250 },
          { x: 370, y: 350 },
          { x: 230, y: 350 },
          { x: 200, y: 250 },
        ],
        closed: true,
        fill: "#3b82f6",
        stroke: "#000000",
        strokeWidth: 2,
        opacity: 1,
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
  text: {
    label: "Text",
    icon: Type,
    canvasElement: TextElement,
    propertiesFields: TextProperties,
    createDefault: () => ({
      type: "text",
      transform: { x: 250, y: 250, width: 200, rotation: 0, scaleX: 1, scaleY: 1 },
      fields: {
        _type: "text",
        text: "New Text",
        fontSize: 24,
        fontFamily: "Arial",
        color: "#000000",
      },
      properties: { zIndex: 0, locked: false, visible: true },
    }),
  },
};

export const TOOLBAR_ELEMENT_KEYS = [
  "shape:rect",
  "shape:circle",
  "shape:line",
  "shape:arrow",
  "shape:arc",
  "shape:polygon",
  "text",
] as const;

export function definitionForFields(fields: CanvasFields): ElementDefinition | undefined {
  return elementRegistry[getElementKey(fields)];
}
