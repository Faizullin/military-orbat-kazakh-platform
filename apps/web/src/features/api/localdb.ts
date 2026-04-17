import type { Scenario } from "@/types/scenarioModels";
import { nanoid } from "@/utils";
import { saveBlobToLocalFile } from "@/utils/files";
import { api } from "./client";

export interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  created: Date;
  modified: Date;
  image: string;
}

function toMetadata(item: {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}): ScenarioMetadata {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    created: new Date(item.createdAt),
    modified: new Date(item.updatedAt),
    image: "",
  };
}

export async function useIndexedDb() {
  async function addScenario(scenario: Scenario, id?: string): Promise<string> {
    const scenarioId = id ?? scenario.id ?? nanoid();
    if (scenario.id !== scenarioId) {
      scenario = { ...scenario, id: scenarioId };
    }
    const res = await api.api.scenarios.$post({
      json: {
        name: scenario.name,
        description: scenario.description ?? "",
        data: scenario as unknown as Record<string, unknown>,
        startTime: scenario.startTime ?? null,
        timeZone: scenario.timeZone ?? undefined,
      },
    });
    const row = await res.json();
    if ("error" in row) throw new Error(String(row.error));
    return row.id;
  }

  async function putScenario(scenario: Scenario): Promise<string> {
    const res = await api.api.scenarios[":id"].$put({
      param: { id: scenario.id },
      json: {
        name: scenario.name,
        description: scenario.description ?? "",
        data: scenario as unknown as Record<string, unknown>,
        startTime: scenario.startTime ?? null,
        timeZone: scenario.timeZone ?? undefined,
      },
    });
    const row = await res.json();
    if ("error" in row) throw new Error(String(row.error));
    return scenario.id;
  }

  async function loadScenario(id: string): Promise<Scenario | undefined> {
    try {
      const res = await api.api.scenarios[":id"].$get({ param: { id } });
      const row = await res.json();
      if ("error" in row) return undefined;
      const scenario = row.data as unknown as Scenario;
      if (!scenario.meta) {
        scenario.meta = {
          createdDate: new Date(row.createdAt).toISOString(),
          lastModifiedDate: new Date(row.updatedAt).toISOString(),
        };
      }
      return scenario;
    } catch {
      return undefined;
    }
  }

  async function listScenarios(): Promise<ScenarioMetadata[]> {
    const res = await api.api.scenarios.$get();
    const items = await res.json();
    return items.map(toMetadata);
  }

  async function deleteScenario(id: string): Promise<void> {
    await api.api.scenarios[":id"].$delete({ param: { id } });
  }

  async function deleteScenarios(ids: string[]): Promise<void> {
    await api.api.scenarios["batch-delete"].$post({
      json: { ids },
    });
  }

  async function duplicateScenario(id: string): Promise<string | undefined> {
    try {
      const res = await api.api.scenarios[":id"].duplicate.$post({
        param: { id },
      });
      const row = await res.json();
      if ("error" in row) return undefined;
      return row.id;
    } catch {
      return undefined;
    }
  }

  async function downloadAsJson(id: string, fileName?: string): Promise<void> {
    let name = fileName;
    const scenario = await loadScenario(id);
    if (!scenario) return;
    if (!name) {
      const { default: filenamify } = await import("filenamify/browser");
      name = filenamify(scenario.name) + ".json";
    }
    await saveBlobToLocalFile(
      new Blob([JSON.stringify(scenario)], { type: "application/json" }),
      name,
    );
  }

  async function getScenarioInfo(id: string): Promise<ScenarioMetadata | undefined> {
    try {
      const res = await api.api.scenarios[":id"].info.$get({ param: { id } });
      const item = await res.json();
      if ("error" in item) return undefined;
      return toMetadata(item);
    } catch {
      return undefined;
    }
  }

  return {
    addScenario,
    listScenarios,
    loadScenario,
    putScenario,
    deleteScenario,
    deleteScenarios,
    duplicateScenario,
    downloadAsJson,
    getScenarioInfo,
  };
}
