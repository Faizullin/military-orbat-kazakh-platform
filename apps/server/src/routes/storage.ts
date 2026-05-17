import { Hono } from "hono";
import { inferLocalContentType, readLocalStorageFile } from "../lib/storage/local";

const storage = new Hono().get("/*", async (c) => {
  const mediaPrefix = "/media/public/";
  const path = c.req.path;
  const storageKey = path.startsWith(mediaPrefix) ? decodeURIComponent(path.slice(mediaPrefix.length)) : "";

  if (!storageKey) {
    return c.json({ error: "Not found" }, 404);
  }

  try {
    const { data } = await readLocalStorageFile(storageKey);
    return new Response(data, {
      headers: {
        "Content-Type": inferLocalContentType(storageKey),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

export { storage };