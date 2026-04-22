import { Hono } from "hono";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@repo/db";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { getStorageProvider, type UploadResult } from "../lib/storage";

const actionSchema = z.enum(["thumbnail", "attachment"]);
type SymbolFileSlot = z.infer<typeof actionSchema>;

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const THUMBNAIL_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ATTACHMENT_MIME_TYPES = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

interface PreparedSymbolFile {
  buffer: Buffer;
  checksum: string;
  contentType: string;
  size: number;
}

function resolveAttachmentType(mime: string) {
  if (mime.startsWith("image/")) return "IMAGE" as const;
  if (mime.startsWith("video/")) return "VIDEO" as const;
  if (mime.startsWith("audio/")) return "AUDIO" as const;
  if (mime === "application/pdf") return "DOCUMENT" as const;
  return "OTHER" as const;
}

function normalizeMime(file: File) {
  const name = file.name.toLowerCase();
  if (file.type) return file.type.toLowerCase();
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function assertSafeSvg(buffer: Buffer) {
  const source = buffer.toString("utf8");
  const lower = source.toLowerCase();

  if (!lower.includes("<svg")) {
    throw new Error("SVG file must contain an <svg> element");
  }

  const forbiddenPatterns = [
    /<script\b/i,
    /<foreignobject\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<link\b/i,
    /<!doctype\b/i,
    /<!entity\b/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /data:text\/html/i,
    /url\(\s*['"]?\s*(?:javascript:|data:text\/html)/i,
    /(?:href|xlink:href)\s*=\s*["']\s*(?!#|data:image\/(?:png|jpeg|jpg|webp|gif);base64,)/i,
  ];

  if (forbiddenPatterns.some((pattern) => pattern.test(source))) {
    throw new Error("SVG contains unsupported active or external content");
  }
}

async function prepareSymbolFile(
  file: File,
  slot: SymbolFileSlot,
): Promise<PreparedSymbolFile> {
  const contentType = normalizeMime(file);
  const allowedTypes =
    slot === "thumbnail" ? THUMBNAIL_MIME_TYPES : ATTACHMENT_MIME_TYPES;
  const maxSize = slot === "thumbnail" ? MAX_THUMBNAIL_BYTES : MAX_ATTACHMENT_BYTES;

  if (!allowedTypes.has(contentType)) {
    throw new Error(
      slot === "thumbnail"
        ? "Thumbnail must be PNG, JPEG, or WebP"
        : "Attachment must be SVG, PNG, JPEG, or WebP",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxSize) {
    throw new Error(
      slot === "thumbnail"
        ? "Thumbnail must be 2 MB or smaller"
        : "Attachment must be 5 MB or smaller",
    );
  }

  if (contentType === "image/svg+xml") {
    assertSafeSvg(buffer);
  }

  return {
    buffer,
    checksum: crypto.createHash("md5").update(buffer).digest("hex"),
    contentType,
    size: buffer.length,
  };
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

    let prepared: PreparedSymbolFile;
    try {
      prepared = await prepareSymbolFile(file, action);
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Invalid upload file" },
        400,
      );
    }

    const storage = getStorageProvider();

    const oldAttachment = action === "thumbnail" ? symbol.thumbnail : symbol.attachment;
    let uploadedStorageKey: string | null = null;
    let result: UploadResult | null = null;

    try {
      result = await storage.uploadFile({
        file: {
          name: file.name,
          mimetype: prepared.contentType,
          size: prepared.size,
          data: prepared.buffer,
        },
        userId,
        type: action === "thumbnail" ? "thumbnails" : "attachments",
      });
      uploadedStorageKey = result.storageKey;

      const attachment = await prisma.$transaction(async (tx) => {
        const att = await tx.attachment.create({
          data: {
            originalFilename: file.name,
            storageKey: result!.storageKey,
            storageBackend: result!.storageBackend,
            contentType: prepared.contentType,
            fileSize: BigInt(prepared.size),
            checksum: prepared.checksum,
            attachmentType: resolveAttachmentType(prepared.contentType),
            url: result!.url,
            title: file.name,
            uploadedById: userId,
          },
        });

        await tx.topographicSymbol.update({
          where: { id: symbolId },
          data:
            action === "thumbnail" ? { thumbnailId: att.id } : { attachmentId: att.id },
        });

        return att;
      });

      uploadedStorageKey = null;

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
        url: result!.url,
        action,
        symbolId,
      });
    } catch (e) {
      if (uploadedStorageKey) {
        try {
          await storage.deleteFile(uploadedStorageKey);
        } catch (cleanupError) {
          console.error(`Failed to cleanup failed ${action} upload:`, cleanupError);
        }
      }
      throw e;
    }
  })

  // POST /api/symbols/:id/convert
  // FormData: thumbnail PNG/WebP/JPEG + attachment SVG/PNG/WebP/JPEG.
  // Replaces both thumbnail and attachment in one shot.
  .post("/:id/convert", async (c) => {
    const userId = c.get("user").id;
    const symbolId = c.req.param("id");

    const formData = await c.req.formData();
    const thumbnailFile = formData.get("thumbnail") as File | null;
    const attachmentFile = formData.get("attachment") as File | null;

    if (!thumbnailFile || !attachmentFile) {
      return c.json({ error: "Missing thumbnail or attachment field" }, 400);
    }

    let thumbnailPrepared: PreparedSymbolFile;
    let attachmentPrepared: PreparedSymbolFile;
    try {
      thumbnailPrepared = await prepareSymbolFile(thumbnailFile, "thumbnail");
      attachmentPrepared = await prepareSymbolFile(attachmentFile, "attachment");
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Invalid convert files" },
        400,
      );
    }

    const symbol = await prisma.topographicSymbol.findFirst({
      where: { id: symbolId, userId },
      include: { attachment: true, thumbnail: true },
    });
    if (!symbol) return c.json({ error: "Symbol not found" }, 404);

    const storage = getStorageProvider();
    const uploadedStorageKeys: string[] = [];

    async function uploadOne(
      file: File,
      prepared: PreparedSymbolFile,
      slot: "thumbnails" | "attachments",
    ) {
      const result = await storage.uploadFile({
        file: {
          name: file.name,
          mimetype: prepared.contentType,
          size: prepared.size,
          data: prepared.buffer,
        },
        userId,
        type: slot,
      });
      uploadedStorageKeys.push(result.storageKey);
      return { result, prepared };
    }

    try {
      const [thumbUp, attUp] = await Promise.all([
        uploadOne(thumbnailFile, thumbnailPrepared, "thumbnails"),
        uploadOne(attachmentFile, attachmentPrepared, "attachments"),
      ]);

      const updated = await prisma.$transaction(async (tx) => {
        const thumbRow = await tx.attachment.create({
          data: {
            originalFilename: thumbnailFile.name,
            storageKey: thumbUp.result.storageKey,
            storageBackend: thumbUp.result.storageBackend,
            contentType: thumbUp.prepared.contentType,
            fileSize: BigInt(thumbUp.prepared.size),
            checksum: thumbUp.prepared.checksum,
            attachmentType: resolveAttachmentType(thumbUp.prepared.contentType),
            url: thumbUp.result.url,
            title: thumbnailFile.name,
            uploadedById: userId,
          },
        });
        const attRow = await tx.attachment.create({
          data: {
            originalFilename: attachmentFile.name,
            storageKey: attUp.result.storageKey,
            storageBackend: attUp.result.storageBackend,
            contentType: attUp.prepared.contentType,
            fileSize: BigInt(attUp.prepared.size),
            checksum: attUp.prepared.checksum,
            attachmentType: resolveAttachmentType(attUp.prepared.contentType),
            url: attUp.result.url,
            title: attachmentFile.name,
            uploadedById: userId,
          },
        });
        return tx.topographicSymbol.update({
          where: { id: symbolId },
          data: { thumbnailId: thumbRow.id, attachmentId: attRow.id },
          include: {
            thumbnail: { select: { id: true, url: true } },
            attachment: { select: { id: true, url: true } },
          },
        });
      });

      uploadedStorageKeys.length = 0;

      for (const old of [symbol.thumbnail, symbol.attachment]) {
        if (!old) continue;
        try {
          await storage.deleteFile(old.storageKey);
          await prisma.attachment.delete({ where: { id: old.id } });
        } catch (e) {
          console.error(`Failed to cleanup old attachment ${old.id}:`, e);
        }
      }

      return c.json(updated);
    } catch (e) {
      for (const storageKey of uploadedStorageKeys) {
        try {
          await storage.deleteFile(storageKey);
        } catch (cleanupError) {
          console.error("Failed to cleanup failed convert upload:", cleanupError);
        }
      }
      throw e;
    }
  });

export { upload };
