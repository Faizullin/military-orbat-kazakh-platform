// Custom localdb.ts — PROTECTED from upstream sync
// This replaces IndexedDB with REST API calls
import type { Scenario } from "@/types/scenarioModels";

const API_BASE = "/api";

export async function useIndexedDb() {
  async function addScenario(scenario: Scenario, id?: string) {
    // Custom: POST to API instead of IndexedDB
    return "placeholder";
  }

  async function loadScenario(id: string) {
    // Custom: GET from API instead of IndexedDB
    return undefined;
  }

  return { addScenario, loadScenario };
}
