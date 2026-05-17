import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir       = dirname(fileURLToPath(import.meta.url));
const CREDS_DIR   = resolve(__dir, "..", "..", "..", "credentials");
const PRICING_FILE = resolve(CREDS_DIR, "pricing.json");

const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1_000; // 3 days

export type PriceEntry = { input: number; output: number };
export type PricingMap = Record<string, PriceEntry>;

// Our model name → OpenRouter model-id prefix (verified 2026-05)
const OR_MAP: Record<string, string> = {
  "gemini-3-flash-preview":        "google/gemini-3-flash-preview",
  "gemini-3-pro-image-preview":    "google/gemini-3-pro-image-preview",
  "gemini-2.5-pro":                "google/gemini-2.5-pro",
  "gemini-2.5-flash":              "google/gemini-2.5-flash",
  "claude-sonnet-4-6":             "anthropic/claude-sonnet-4.6",
  "claude-opus-4-7":               "anthropic/claude-opus-4.7",
  "claude-sonnet-4-20250514":      "anthropic/claude-sonnet-4.5",
  "kimi-k2.6":                     "moonshotai/kimi-k2.6",
  "moonshot-v1-8k-vision-preview": "moonshotai/kimi-k2.5",
};

// Sorted key fingerprint — changes when models are added or removed
const MODEL_FINGERPRINT = Object.keys(OR_MAP).sort().join(",");

type CacheFile = {
  createdAt:         string;
  updatedAt:         string;
  modelFingerprint:  string;
  pricing:           PricingMap;
};

type StaleReason = "missing" | "expired" | "models_changed";

function checkCache(): { valid: true; data: CacheFile } | { valid: false; reason: StaleReason } {
  if (!existsSync(PRICING_FILE)) return { valid: false, reason: "missing" };

  let data: CacheFile;
  try {
    data = JSON.parse(readFileSync(PRICING_FILE, "utf-8")) as CacheFile;
  } catch {
    return { valid: false, reason: "missing" };
  }

  // Condition 1: expired (older than 3 days based on updatedAt)
  const updatedAt = new Date(data.updatedAt ?? data.createdAt ?? 0).getTime();
  if (Date.now() - updatedAt > CACHE_TTL_MS) {
    return { valid: false, reason: "expired" };
  }

  // Condition 2: model registry changed
  if (data.modelFingerprint !== MODEL_FINGERPRINT) {
    return { valid: false, reason: "models_changed" };
  }

  return { valid: true, data };
}

type OrModel = { id: string; pricing?: { prompt?: string; completion?: string } };

function priceToPerMillion(value: unknown): number {
  if (typeof value !== "string") return NaN;
  return Math.round(parseFloat(value) * 1_000_000 * 10_000) / 10_000;
}

async function fetchFromOpenRouter(): Promise<PricingMap> {
  const resp = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "HTTP-Referer": "military-orbat-platform", "X-Title": "Military ORBAT" },
  });
  if (!resp.ok) throw new Error(`OpenRouter request failed: ${resp.status} ${resp.statusText}`);

  const data = (await resp.json()) as { data: OrModel[] };
  if (!Array.isArray(data.data) || data.data.length === 0)
    throw new Error("OpenRouter returned no model data");

  const byId = Object.fromEntries(data.data.map((m) => [m.id, m]));
  const pricing: PricingMap = {};

  for (const [ourName, orPrefix] of Object.entries(OR_MAP)) {
    const match: OrModel | undefined =
      byId[orPrefix] ??
      data.data
        .filter((m) => m.id.startsWith(orPrefix))
        .sort((a, b) => a.id.length - b.id.length)[0];

    if (!match) throw new Error(`OpenRouter model not found for ${ourName} (${orPrefix})`);

    const inp = priceToPerMillion(match.pricing?.prompt);
    const out = priceToPerMillion(match.pricing?.completion);
    if (!Number.isFinite(inp) || !Number.isFinite(out))
      throw new Error(`Invalid pricing for ${ourName} (${match.id})`);

    pricing[ourName] = { input: inp, output: out };
    console.log(`  [pricing] ${ourName.padEnd(36)} in=$${inp}  out=$${out}  (${match.id})`);
  }

  return pricing;
}

function saveCache(pricing: PricingMap, existing?: CacheFile): void {
  const now = new Date().toISOString();
  const file: CacheFile = {
    createdAt:        existing?.createdAt ?? now,
    updatedAt:        now,
    modelFingerprint: MODEL_FINGERPRINT,
    pricing,
  };
  mkdirSync(CREDS_DIR, { recursive: true });
  writeFileSync(PRICING_FILE, JSON.stringify(file, null, 2), "utf-8");
  console.log(`[pricing] Saved to credentials/pricing.json (createdAt=${file.createdAt})`);
}

export async function loadPricing(): Promise<PricingMap> {
  const check = checkCache();

  if (check.valid) {
    const { data } = check;
    console.log(
      `[pricing] Cache valid — updatedAt=${data.updatedAt}  models=${Object.keys(data.pricing).length}`
    );
    return data.pricing;
  }

  const reason: Record<StaleReason, string> = {
    missing:        "credentials/pricing.json not found",
    expired:        "cache older than 3 days",
    models_changed: "model registry changed (added/removed entries)",
  };
  console.log(`[pricing] Refetching from OpenRouter — reason: ${reason[check.reason]}`);

  const existingCache = check.reason !== "missing"
    ? (() => {
        try { return JSON.parse(readFileSync(PRICING_FILE, "utf-8")) as CacheFile; }
        catch { return undefined; }
      })()
    : undefined;

  const pricing = await fetchFromOpenRouter();
  saveCache(pricing, existingCache);
  return pricing;
}
