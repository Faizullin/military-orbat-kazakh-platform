import { createApp, nextTick } from "vue";
import VueKonva from "vue-konva";
import SymbolRenderer from "./SymbolRenderer.vue";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

export async function renderContentToPng(
  code: string,
  width: number,
  height: number,
  pixelRatio: number = 1,
  background: boolean = true,
): Promise<Blob> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "-99999px";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const app = createApp(SymbolRenderer, { code, width, height, background });
  app.use(VueKonva);

  try {
    const instance = app.mount(host) as unknown as {
      getStage: () => { toDataURL: (opts: object) => string } | null;
    };

    await nextTick();
    await nextFrame();
    await nextFrame();

    const stage = instance.getStage();
    if (!stage) throw new Error("Konva stage not available");

    const dataUrl = stage.toDataURL({
      mimeType: "image/png",
      pixelRatio,
    });
    return await dataUrlToBlob(dataUrl);
  } finally {
    app.unmount();
    host.remove();
  }
}
