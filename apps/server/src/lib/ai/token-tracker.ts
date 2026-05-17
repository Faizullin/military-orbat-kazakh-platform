import { loadPricing } from "./pricing-loader";
import type { PricingMap } from "./pricing-loader";

const PRICING: PricingMap = await loadPricing();

export function calcCost(model: string, inp: number, out: number): number {
  const p = PRICING[model];
  if (!p) {
    console.warn(`[pricing] No pricing entry for model "${model}" — cost reported as $0`);
    return 0;
  }
  return (inp / 1_000_000) * p.input + (out / 1_000_000) * p.output;
}

export type UsageRecord = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TrackedRecord = UsageRecord & { step: string };

export class TokenTracker {
  private records: TrackedRecord[] = [];

  track(step: string, usage: UsageRecord): void {
    this.records.push({ step, ...usage });
  }

  totals() {
    return {
      inputTokens:  this.records.reduce((s, r) => s + r.inputTokens,  0),
      outputTokens: this.records.reduce((s, r) => s + r.outputTokens, 0),
      costUsd:      this.records.reduce((s, r) => s + r.costUsd,      0),
    };
  }

  getRecords(): TrackedRecord[] { return [...this.records]; }
  reset(): void                 { this.records = []; }
}
