import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { AI_PROVIDERS, ALL_MODEL_IDS } from "../lib/ai/model-factory";
import { SymbolGenerator } from "../lib/ai/symbol-generator";

const imagePartSchema = z.object({
  dataUrl:   z.string().min(1),
  mediaType: z.string().min(1),
});

const modelField = z.string().refine((m) => ALL_MODEL_IDS.includes(m)).optional();

const generateSchema = z.object({
  provider:       z.enum(AI_PROVIDERS),
  model:          modelField,
  referenceImage: imagePartSchema,
  prompt:         z.string().max(2000).optional(),
});

const refineSchema = z.object({
  provider:       z.enum(AI_PROVIDERS),
  model:          modelField,
  referenceImage: imagePartSchema,
  previousRender: imagePartSchema,
  previousCode:   z.string().min(1),
  prompt:         z.string().max(2000).optional(),
});

const generator = new SymbolGenerator();

const ai = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  .post("/generate", zValidator("json", generateSchema), async (c) => {
    const body = c.req.valid("json");
    try {
      return c.json(await generator.generate(body));
    } catch (e) {
      console.error("[ai/generate]", e);
      return c.json({ error: e instanceof Error ? e.message : "AI generation failed" }, 500);
    }
  })

  .post("/refine", zValidator("json", refineSchema), async (c) => {
    const body = c.req.valid("json");
    try {
      return c.json(await generator.refine(body));
    } catch (e) {
      console.error("[ai/refine]", e);
      return c.json({ error: e instanceof Error ? e.message : "AI refinement failed" }, 500);
    }
  });

export { ai, AI_PROVIDERS };
export type { AiProvider } from "../lib/ai/model-factory";
