import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import crypto from "node:crypto";
import { prisma, type Attachment } from "@repo/db";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import {
  getStorageProvider,
  type IStorageProvider,
  type UploadResult,
} from "../lib/storage";

const categorySchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.trim() || null;
}, z.string().nullable().optional());

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  code: z.string(),
  renderType: z.enum(["FILE", "EDITOR"]),
  category: categorySchema,
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  renderType: z.enum(["FILE", "EDITOR"]).optional(),
  category: categorySchema,
});

const listQuerySchema = z.object({
  category: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      return value.trim() ? value : undefined;
    },
    z.string().optional(),
  ),
});

interface ClonedAttachmentUpload {
  source: Attachment;
  result: UploadResult;
  checksum: string;
  size: number;
}

async function cloneAttachmentUpload(
  source: Attachment | null,
  options: {
    storage: IStorageProvider;
    userId: string;
    type: "thumbnails" | "attachments";
  },
): Promise<ClonedAttachmentUpload | null> {
  if (!source?.url) return null;

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Failed to download attachment ${source.id} for duplication`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const checksum = crypto.createHash("md5").update(buffer).digest("hex");
  const result = await options.storage.uploadFile({
    file: {
      name: source.originalFilename,
      mimetype: source.contentType,
      size: buffer.length,
      data: buffer,
    },
    userId: options.userId,
    type: options.type,
  });

  return {
    source,
    result,
    checksum,
    size: buffer.length,
  };
}

const symbols = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const userId = c.get("user").id;
    const { category } = c.req.valid("query");

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
        thumbnail: { select: { id: true, url: true } },
        attachment: { select: { id: true, url: true } },
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
        thumbnail: { select: { id: true, url: true } },
        attachment: { select: { id: true, url: true } },
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
        thumbnail: { select: { id: true, url: true } },
        attachment: { select: { id: true, url: true } },
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
        thumbnail: { select: { id: true, url: true } },
        attachment: { select: { id: true, url: true } },
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
      include: { attachment: true, thumbnail: true },
    });
    if (!source) return c.json({ error: "Not found" }, 404);

    const storage = getStorageProvider();
    const clonedUploads: ClonedAttachmentUpload[] = [];

    try {
      const thumbnailUpload = await cloneAttachmentUpload(source.thumbnail, {
        storage,
        userId,
        type: "thumbnails",
      });
      if (thumbnailUpload) clonedUploads.push(thumbnailUpload);

      const attachmentUpload = await cloneAttachmentUpload(source.attachment, {
        storage,
        userId,
        type: "attachments",
      });
      if (attachmentUpload) clonedUploads.push(attachmentUpload);

      const copy = await prisma.$transaction(async (tx) => {
        const thumbnail = thumbnailUpload
          ? await tx.attachment.create({
              data: {
                originalFilename: thumbnailUpload.source.originalFilename,
                storageKey: thumbnailUpload.result.storageKey,
                storageBackend: thumbnailUpload.result.storageBackend,
                contentType: thumbnailUpload.source.contentType,
                fileSize: BigInt(thumbnailUpload.size),
                checksum: thumbnailUpload.checksum,
                attachmentType: thumbnailUpload.source.attachmentType,
                url: thumbnailUpload.result.url,
                title: thumbnailUpload.source.title,
                uploadedById: userId,
              },
            })
          : null;
        const attachment = attachmentUpload
          ? await tx.attachment.create({
              data: {
                originalFilename: attachmentUpload.source.originalFilename,
                storageKey: attachmentUpload.result.storageKey,
                storageBackend: attachmentUpload.result.storageBackend,
                contentType: attachmentUpload.source.contentType,
                fileSize: BigInt(attachmentUpload.size),
                checksum: attachmentUpload.checksum,
                attachmentType: attachmentUpload.source.attachmentType,
                url: attachmentUpload.result.url,
                title: attachmentUpload.source.title,
                uploadedById: userId,
              },
            })
          : null;

        return tx.topographicSymbol.create({
          data: {
            name: `${source.name} (copy)`,
            description: source.description,
            code: source.code,
            renderType: source.renderType,
            category: source.category,
            userId,
            thumbnailId: thumbnail?.id,
            attachmentId: attachment?.id,
          },
          include: {
            thumbnail: { select: { id: true, url: true } },
            attachment: { select: { id: true, url: true } },
          },
        });
      });

      clonedUploads.length = 0;
      return c.json(copy, 201);
    } catch (e) {
      for (const upload of clonedUploads) {
        try {
          await storage.deleteFile(upload.result.storageKey);
        } catch (cleanupError) {
          console.error("Failed to cleanup duplicate attachment upload:", cleanupError);
        }
      }
      throw e;
    }
  });

export { symbols };
