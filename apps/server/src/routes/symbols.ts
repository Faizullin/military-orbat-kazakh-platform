import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { getStorageProvider } from "../lib/storage";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  code: z.string(),
  renderType: z.enum(["FILE", "EDITOR"]),
  category: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  renderType: z.enum(["FILE", "EDITOR"]).optional(),
  category: z.string().nullable().optional(),
});

const symbols = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  .get("/", async (c) => {
    const userId = c.get("user").id;
    const category = c.req.query("category");

    const where: { userId: string; category?: string } = { userId };
    if (category) where.category = category;

    const list = await prisma.topographicSymbol.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        renderType: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        thumbnail: { select: { url: true } },
        attachment: { select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return c.json(list);
  })

  .get("/categories", async (c) => {
    const userId = c.get("user").id;
    const result = await prisma.topographicSymbol.findMany({
      where: { userId, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    const categories = result.map((r) => r.category).filter(Boolean);
    return c.json(categories);
  })

  .get("/:id", async (c) => {
    const userId = c.get("user").id;
    const symbol = await prisma.topographicSymbol.findFirst({
      where: { id: c.req.param("id"), userId },
      include: {
        thumbnail: { select: { url: true } },
        attachment: { select: { url: true } },
      },
    });
    if (!symbol) return c.json({ error: "Not found" }, 404);
    return c.json(symbol);
  })

  .post("/", zValidator("json", createSchema), async (c) => {
    const userId = c.get("user").id;
    const { name, description, code, renderType, category } = c.req.valid("json");
    const symbol = await prisma.topographicSymbol.create({
      data: { name, description, code, renderType, category: category ?? null, userId },
      include: {
        thumbnail: { select: { url: true } },
        attachment: { select: { url: true } },
      },
    });
    return c.json(symbol, 201);
  })

  .put("/:id", zValidator("json", updateSchema), async (c) => {
    const userId = c.get("user").id;
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const symbol = await prisma.topographicSymbol.update({
      where: { id, userId },
      data,
      include: {
        thumbnail: { select: { url: true } },
        attachment: { select: { url: true } },
      },
    });
    return c.json(symbol);
  })

  .delete("/:id", async (c) => {
    const userId = c.get("user").id;
    const id = c.req.param("id");

    const symbol = await prisma.topographicSymbol.findFirst({
      where: { id, userId },
      include: { attachment: true, thumbnail: true },
    });
    if (!symbol) return c.json({ error: "Not found" }, 404);

    await prisma.topographicSymbol.delete({ where: { id } });

    const storage = getStorageProvider();
    for (const att of [symbol.attachment, symbol.thumbnail]) {
      if (!att) continue;
      try {
        await storage.deleteFile(att.storageKey);
        await prisma.attachment.delete({ where: { id: att.id } });
      } catch (e) {
        console.error(`Failed to cleanup attachment ${att.id}:`, e);
      }
    }

    return c.json({ ok: true });
  })

  .post("/:id/duplicate", async (c) => {
    const userId = c.get("user").id;
    const source = await prisma.topographicSymbol.findFirst({
      where: { id: c.req.param("id"), userId },
    });
    if (!source) return c.json({ error: "Not found" }, 404);

    const copy = await prisma.topographicSymbol.create({
      data: {
        name: `${source.name} (copy)`,
        description: source.description,
        code: source.code,
        renderType: source.renderType,
        category: source.category,
        userId,
      },
      include: {
        thumbnail: { select: { url: true } },
        attachment: { select: { url: true } },
      },
    });
    return c.json(copy, 201);
  });

export { symbols };
