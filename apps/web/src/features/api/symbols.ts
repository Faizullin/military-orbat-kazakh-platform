import type { InferResponseType } from "hono/client";
import { api, ApiError } from "./client";

export type ServerSymbol = Exclude<
  InferResponseType<(typeof api.api.symbols)[":id"]["$get"]>,
  { error: string }
>;
export type ServerSymbolListItem = InferResponseType<
  typeof api.api.symbols.$get
>[number];

export type RenderType = "FILE" | "EDITOR";

export interface CreateSymbolInput {
  name: string;
  description?: string;
  code: string;
  renderType: RenderType;
  category?: string | null;
}

export interface UpdateSymbolInput {
  name?: string;
  description?: string;
  code?: string;
  renderType?: RenderType;
  category?: string | null;
}

async function unwrap<T extends { error: string } | object>(
  res: Response,
  data: T,
): Promise<Exclude<T, { error: string }>> {
  if ("error" in data) throw new ApiError(res.status, String(data.error));
  return data as Exclude<T, { error: string }>;
}

export function useSymbolsApi() {
  async function listSymbols(category?: string): Promise<ServerSymbolListItem[]> {
    const res = await api.api.symbols.$get({
      query: category ? { category } : {},
    });
    return res.json();
  }

  async function listCategories(): Promise<string[]> {
    const res = await api.api.symbols.categories.$get();
    const data = await res.json();
    return data.filter((c): c is string => typeof c === "string");
  }

  async function getSymbol(id: string): Promise<ServerSymbol> {
    const res = await api.api.symbols[":id"].$get({ param: { id } });
    return unwrap(res, await res.json());
  }

  async function createSymbol(input: CreateSymbolInput): Promise<ServerSymbol> {
    const res = await api.api.symbols.$post({
      json: {
        name: input.name,
        description: input.description ?? "",
        code: input.code,
        renderType: input.renderType,
        category: input.category ?? null,
      },
    });
    return (await unwrap(res, await res.json())) as ServerSymbol;
  }

  async function updateSymbol(
    id: string,
    input: UpdateSymbolInput,
  ): Promise<ServerSymbol> {
    const res = await api.api.symbols[":id"].$put({
      param: { id },
      json: input,
    });
    return (await unwrap(res, await res.json())) as ServerSymbol;
  }

  async function deleteSymbol(id: string): Promise<void> {
    const res = await api.api.symbols[":id"].$delete({ param: { id } });
    const data = await res.json();
    if ("error" in data) throw new ApiError(res.status, String(data.error));
  }

  async function duplicateSymbol(id: string): Promise<ServerSymbol> {
    const res = await api.api.symbols[":id"].duplicate.$post({ param: { id } });
    return (await unwrap(res, await res.json())) as ServerSymbol;
  }

  async function uploadSymbolFile(
    id: string,
    file: File,
    action: "thumbnail" | "attachment",
  ): Promise<{ id: string; url: string; action: string; symbolId: string }> {
    const form = new FormData();
    form.append("file", file);
    form.append("action", action);
    const res = await fetch(`/api/symbols/${encodeURIComponent(id)}/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json();
    if (!res.ok || "error" in data) {
      throw new ApiError(res.status, String(data.error ?? "Upload failed"));
    }
    return data;
  }

  return {
    listSymbols,
    listCategories,
    getSymbol,
    createSymbol,
    updateSymbol,
    deleteSymbol,
    duplicateSymbol,
    uploadSymbolFile,
  };
}
