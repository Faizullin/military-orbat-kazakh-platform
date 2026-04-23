import { describe, expect, it, vi } from "vitest";
import Icon from "ol/style/Icon";
import { createUnitStyle } from "./unitStyles";
import { mapReinforcedStatus2Field } from "@/types/scenarioModels";

const mapSettingsMock = {
  mapIconSize: 40,
  mapCustomIconScale: 1.7,
  mapUnitLabelBelow: false,
};

const { symbolGeneratorMock } = vi.hoisted(() => ({
  symbolGeneratorMock: vi.fn(() => ({
    getAnchor: () => ({ x: 10, y: 10 }),
    asCanvas: () => document.createElement("canvas"),
  })),
}));

vi.mock("@/symbology/milsymbwrapper", () => ({
  symbolGenerator: symbolGeneratorMock,
}));

vi.mock("@/stores/settingsStore", () => ({
  useSymbolSettingsStore: () => ({ symbolOptions: {} }),
}));

vi.mock("@/stores/mapSettingsStore.ts", () => ({
  useMapSettingsStore: () => mapSettingsMock,
}));

function createScenarioWithCustomSymbol(
  customSymbolOverrides: Record<string, unknown> = {},
) {
  return {
    store: {
      state: {
        customSymbolMap: {
          "custom-1": {
            id: "custom-1",
            name: "Custom",
            src: "data:image/svg+xml;base64,PHN2Zy8+",
            sidc: "10031000000000000000",
            ...customSymbolOverrides,
          },
        },
      },
    },
  } as any;
}

function getIconColorFromStyle(style: ReturnType<typeof createUnitStyle>["style"]) {
  const image = style.getImage();
  expect(image).toBeInstanceOf(Icon);
  if (!(image instanceof Icon)) {
    throw new Error("Expected style image to be an Icon");
  }
  return image.getColor();
}

describe("unit styles rotation", () => {
  it("converts degrees to radians for symbol icon rotation", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 90 },
      textAmplifiers: {},
    } as any;

    const { style } = createUnitStyle(unit, {}, createScenarioWithCustomSymbol());
    expect(style.getImage()?.getRotation()).toBeCloseTo(Math.PI / 2);
  });

  it("creates different cache keys when rotation changes", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 10 },
      textAmplifiers: {},
    } as any;

    const key1 = createUnitStyle(unit, {}, createScenarioWithCustomSymbol()).cacheKey;
    unit._state.symbolRotation = 20;
    const key2 = createUnitStyle(unit, {}, createScenarioWithCustomSymbol()).cacheKey;

    expect(key1).not.toBe(key2);
  });

  it("applies rotation to custom symbols", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "custom1:10031000000000000000:custom-1",
      _state: {
        sidc: "custom1:10031000000000000000:custom-1",
        symbolRotation: 180,
      },
      textAmplifiers: {},
    } as any;

    const { style } = createUnitStyle(unit, {}, createScenarioWithCustomSymbol());
    expect(style.getImage()?.getRotation()).toBeCloseTo(Math.PI);
  });

  it("includes reinforcedReduced in symbol options and cache key", () => {
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "10031000000000000000",
      _state: {
        sidc: "10031000000000000000",
        symbolRotation: 0,
        reinforcedStatus: "Reinforced",
      },
      textAmplifiers: {},
    } as any;

    const key1 = createUnitStyle(
      unit,
      {
        reinforcedReduced: mapReinforcedStatus2Field(unit._state.reinforcedStatus),
      },
      createScenarioWithCustomSymbol(),
    ).cacheKey;

    const firstCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    expect(firstCall?.[1]?.reinforcedReduced).toBe("(+)");

    unit._state.reinforcedStatus = "Reduced";
    const key2 = createUnitStyle(
      unit,
      {
        reinforcedReduced: mapReinforcedStatus2Field(unit._state.reinforcedStatus),
      },
      createScenarioWithCustomSymbol(),
    ).cacheKey;

    const secondCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    expect(secondCall?.[1]?.reinforcedReduced).toBe("(-)");
    expect(key2).not.toBe(key1);
  });
});

describe("unit styles size overrides", () => {
  it("uses map default size when unit size override is missing", () => {
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    createUnitStyle(unit, {}, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.size).toBe(40);
  });

  it("uses unit.style.mapSymbolSize as map symbol size override", () => {
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      style: { mapSymbolSize: 67 },
      textAmplifiers: {},
    } as any;

    createUnitStyle(unit, { size: 23 } as any, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.size).toBe(67);
  });

  it("includes custom symbol size override in cache key", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "custom1:10031000000000000000:custom-1",
      _state: { sidc: "custom1:10031000000000000000:custom-1", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    const keyDefault = createUnitStyle(
      unit,
      {},
      createScenarioWithCustomSymbol(),
    ).cacheKey;
    unit.style = { mapSymbolSize: 50 };
    const keyOverride = createUnitStyle(
      unit,
      {},
      createScenarioWithCustomSymbol(),
    ).cacheKey;

    expect(keyDefault).not.toBe(keyOverride);
  });
});

describe("custom symbol colors", () => {
  it("uses inherited unit fill color for custom symbols by default", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "custom1:10031000000000000000:custom-1",
      _state: { sidc: "custom1:10031000000000000000:custom-1", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    const { style } = createUnitStyle(
      unit,
      { fillColor: "#112233" },
      createScenarioWithCustomSymbol(),
    );

    expect(getIconColorFromStyle(style)).toEqual([17, 34, 51, 1]);
  });

  it("uses custom symbol fixed color when inheritance is disabled", () => {
    const unit = {
      id: "unit-1",
      name: "Unit",
      sidc: "custom1:10031000000000000000:custom-1",
      _state: { sidc: "custom1:10031000000000000000:custom-1", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    const { style } = createUnitStyle(
      unit,
      { fillColor: "#112233" },
      createScenarioWithCustomSymbol({ inheritColor: false, fillColor: "#445566" }),
    );

    expect(getIconColorFromStyle(style)).toEqual([68, 85, 102, 1]);
  });
});

describe("unit styles unique designation", () => {
  it("uses name as uniqueDesignation fallback when shortName is missing", () => {
    mapSettingsMock.mapUnitLabelBelow = false;
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "36CAA",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    createUnitStyle(unit, {}, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.uniqueDesignation).toBe("36CAA");
  });

  it("hides default uniqueDesignation on symbol when bottom labels are enabled", () => {
    mapSettingsMock.mapUnitLabelBelow = true;
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      shortName: "U",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      textAmplifiers: {},
    } as any;

    createUnitStyle(unit, {}, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.uniqueDesignation).toBe("");
  });

  it("keeps overridden uniqueDesignation on symbol when bottom labels are enabled", () => {
    mapSettingsMock.mapUnitLabelBelow = true;
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      shortName: "U",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      textAmplifiers: { uniqueDesignation: "CUSTOM" },
    } as any;

    createUnitStyle(unit, {}, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.uniqueDesignation).toBe("CUSTOM");
  });

  it("keeps overridden uniqueDesignation on symbol when bottom labels are disabled", () => {
    mapSettingsMock.mapUnitLabelBelow = false;
    symbolGeneratorMock.mockClear();
    const unit = {
      id: "unit-1",
      name: "Unit",
      shortName: "U",
      sidc: "10031000000000000000",
      _state: { sidc: "10031000000000000000", symbolRotation: 0 },
      textAmplifiers: { uniqueDesignation: "CUSTOM" },
    } as any;

    createUnitStyle(unit, {}, createScenarioWithCustomSymbol());

    const lastCall = symbolGeneratorMock.mock.lastCall as any[] | undefined;
    const options = lastCall?.[1];
    expect(options?.uniqueDesignation).toBe("CUSTOM");
  });
});
