import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";
import { authMiddleware, type AuthEnv } from "../middleware/auth";

function parseEpoch(val: string | number | null | undefined): bigint | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return BigInt(val);
  const d = new Date(val);
  if (!isNaN(d.getTime())) return BigInt(d.getTime());
  try { return BigInt(val); } catch { return null; }
}

function serializeScenario<T extends { startTime?: bigint | null }>(scenario: T): Omit<T, "startTime"> & { startTime?: number | null } {
  return {
    ...scenario,
    startTime: scenario.startTime != null ? Number(scenario.startTime) : null,
  };
}

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  data: z.record(z.any()),
  startTime: z.union([z.string(), z.number()]).nullable().optional(),
  timeZone: z.string().optional(),
});

const batchDeleteSchema = z.object({
  ids: z.array(z.string()),
});

const scenarios = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  .get("/", async (c) => {
    const userId = c.get("user").id;
    const list = await prisma.scenario.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return c.json(list);
  })

  .get("/:id/info", async (c) => {
    const userId = c.get("user").id;
    const scenario = await prisma.scenario.findFirst({
      where: { id: c.req.param("id"), userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!scenario) return c.json({ error: "Not found" }, 404);
    return c.json(scenario);
  })

  .get("/:id", async (c) => {
    const userId = c.get("user").id;
    const scenario = await prisma.scenario.findFirst({
      where: { id: c.req.param("id"), userId },
    });
    if (!scenario) return c.json({ error: "Not found" }, 404);
    return c.json(serializeScenario(scenario));
  })

  .post("/", zValidator("json", saveSchema), async (c) => {
    const userId = c.get("user").id;
    const { id, name, description, data, startTime, timeZone } = c.req.valid("json");
    const scenario = await prisma.scenario.create({
      data: {
        id,
        name,
        description,
        data,
        startTime: parseEpoch(startTime),
        timeZone: timeZone || null,
        userId,
      },
    });
    return c.json(serializeScenario(scenario), 201);
  })

  .put("/:id", zValidator("json", saveSchema), async (c) => {
    const userId = c.get("user").id;
    const id = c.req.param("id");
    const { name, description, data, startTime, timeZone } = c.req.valid("json");
    const update = await prisma.scenario.updateMany({
      where: { id, userId },
      data: {
        name,
        description,
        data,
        startTime: parseEpoch(startTime),
        timeZone: timeZone || null,
      },
    });

    if (update.count === 0) {
      return c.json({ error: "Not found" }, 404);
    }

    const scenario = await prisma.scenario.findFirst({
      where: { id, userId },
    });
    if (!scenario) return c.json({ error: "Not found" }, 404);

    return c.json(serializeScenario(scenario));
  })

  .delete("/:id", async (c) => {
    const userId = c.get("user").id;
    await prisma.scenario.delete({
      where: { id: c.req.param("id"), userId },
    });
    return c.json({ ok: true });
  })

  .post("/batch-delete", zValidator("json", batchDeleteSchema), async (c) => {
    const userId = c.get("user").id;
    const { ids } = c.req.valid("json");
    await prisma.scenario.deleteMany({
      where: { id: { in: ids }, userId },
    });
    return c.json({ ok: true });
  })

  .post("/:id/duplicate", async (c) => {
    const userId = c.get("user").id;
    const source = await prisma.scenario.findFirst({
      where: { id: c.req.param("id"), userId },
    });
    if (!source) return c.json({ error: "Not found" }, 404);

    const copy = await prisma.scenario.create({
      data: {
        name: `${source.name} (copy)`,
        description: source.description,
        data: (source.data as object) ?? {},
        startTime: source.startTime,
        timeZone: source.timeZone,
        userId,
      },
    });
    return c.json(serializeScenario(copy), 201);
  });

export { scenarios };
