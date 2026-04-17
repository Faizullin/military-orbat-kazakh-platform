import { tool } from "ai";
import { SymbolOutputSchema } from "./schema";

/**
 * All tools used in the symbol generation AI chat.
 * Shared between the route (execute) and the client (types).
 */
export const symbolGenerationTools = {
  generateSymbol: tool({
    description: "Main tool to generate output.",
    inputSchema: SymbolOutputSchema,
    execute: async (args) => {
      return { ...args };
    },
  }),
} as const;

export type SymbolGenerationTools = typeof symbolGenerationTools;
