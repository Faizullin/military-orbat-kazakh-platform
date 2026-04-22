import { computed, ref } from "vue";
import { CUSTOM_SYMBOL_PREFIX } from "@/config/constants.ts";
import type { TScenario } from "@/scenariostore";
import { clearUnitStyleCache } from "@/geo/unitStyles.ts";
import {
  useSymbolsApi,
  type ServerSymbolListItem,
} from "@/features/api/symbols";

const DEFAULT_TOPOGRAPHIC_SIDC = "10031000001100000000";

export function getMapTopographicSymbolSrc(
  symbol: ServerSymbolListItem,
): string | null {
  return symbol.attachment?.url ?? symbol.thumbnail?.url ?? null;
}

function customSymbolSidc(sidc: string, id: string) {
  return `${CUSTOM_SYMBOL_PREFIX}${sidc}:${id}`;
}

export function useMapTopographicSymbols(scenario: TScenario) {
  const { listSymbols } = useSymbolsApi();

  const symbols = ref<ServerSymbolListItem[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);

  const placeableSymbols = computed(() =>
    symbols.value.filter((symbol) => !!getMapTopographicSymbolSrc(symbol)),
  );

  async function loadSymbols(options: { force?: boolean } = {}) {
    if (loading.value) return;
    if (loaded.value && !options.force) return;

    loading.value = true;
    error.value = null;
    try {
      symbols.value = await listSymbols();
      loaded.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load symbols";
    } finally {
      loading.value = false;
    }
  }

  function findExistingScenarioSymbol(source: ServerSymbolListItem) {
    const src = getMapTopographicSymbolSrc(source);
    if (!src) return null;

    return (
      Object.values(scenario.store.state.customSymbolMap).find(
        (symbol) => symbol.name === source.name && symbol.src === src,
      ) ?? null
    );
  }

  function registerSymbol(source: ServerSymbolListItem): string | null {
    const src = getMapTopographicSymbolSrc(source);
    if (!src) return null;

    const existing = findExistingScenarioSymbol(source);
    if (existing) {
      return customSymbolSidc(existing.sidc, existing.id);
    }

    const registered = scenario.settings.addCustomSymbol({
      name: source.name,
      src,
      sidc: DEFAULT_TOPOGRAPHIC_SIDC,
    });
    clearUnitStyleCache();

    return customSymbolSidc(registered.sidc, registered.id);
  }

  return {
    symbols,
    placeableSymbols,
    loading,
    loaded,
    error,
    loadSymbols,
    getSymbolSrc: getMapTopographicSymbolSrc,
    registerSymbol,
  };
}
