import { Hono } from "hono";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@repo/db";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { getStorageProvider } from "../lib/storage";

const actionSchema = z.enum(["thumbnail", "attachment"]);

function resolveAttachmentType(mime: string) {
  if (mime.startsWith("image/")) return "IMAGE" as const;
  if (mime.startsWith("video/")) return "VIDEO" as const;
  if (mime.startsWith("audio/")) return "AUDIO" as const;
  if (mime === "application/pdf") return "DOCUMENT" as const;
  return "OTHER" as const;
}

const upload = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  // POST /api/symbols/:id/upload
  // FormData: file + action ("thumbnail" | "attachment")
  .post("/:id/upload", async (c) => {
    const userId = c.get("user").id;
    const symbolId = c.req.param("id");

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const actionRaw = formData.get("action") as string | null;

    if (!file || !actionRaw) {
      return c.json({ error: "Missing file or action field" }, 400);
    }

    const parsed = actionSchema.safeParse(actionRaw);
    if (!parsed.success) {
      return c.json({ error: "action must be 'thumbnail' or 'attachment'" }, 400);
    }
    const action = parsed.data;

    const symbol = await prisma.topographicSymbol.findFirst({
      where: { id: symbolId, userId },
      include: { attachment: true, thumbnail: true },
    });
    if (!symbol) return c.json({ error: "Symbol not found" }, 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = crypto.createHash("md5").update(buffer).digest("hex");
    const storage = getStorageProvider();

    const result = await storage.uploadFile({
      file: { name: file.name, mimetype: file.type, size: file.size, data: buffer },
      userId,
      type: action === "thumbnail" ? "thumbnails" : "attachments",
    });

    const oldAttachment = action === "thumbnail" ? symbol.thumbnail : symbol.attachment;

    const attachment = await prisma.$transaction(async (tx) => {
      const att = await tx.attachment.create({
        data: {
          originalFilename: file.name,
          storageKey: result.storageKey,
          storageBackend: result.storageBackend,
          contentType: file.type,
          fileSize: BigInt(file.size),
          checksum,
          attachmentType: resolveAttachmentType(file.type),
          url: result.url,
          title: file.name,
          uploadedById: userId,
        },
      });

      await tx.topographicSymbol.update({
        where: { id: symbolId },
        data: action === "thumbnail" ? { thumbnailId: att.id } : { attachmentId: att.id },
      });

      return att;
    });

    if (oldAttachment) {
      try {
        await storage.deleteFile(oldAttachment.storageKey);
        await prisma.attachment.delete({ where: { id: oldAttachment.id } });
      } catch (e) {
        console.error(`Failed to cleanup old ${action} for symbol ${symbolId}:`, e);
      }
    }

    return c.json({
      id: attachment.id,
      url: result.url,
      action,
      symbolId,
    });
  });

export { upload };
