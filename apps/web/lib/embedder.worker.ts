/// <reference lib="webworker" />
import { createLocalEmbedder } from "@echo/embeddings";

/**
 * The model runs here and nowhere else. Downloading it, holding it in memory and running it are all
 * off the main thread, so none of it can ever cost the writer a keystroke.
 */
const embedder = createLocalEmbedder({ runtimePath: "/ort/" });

type Request = { id: number; role: "passage" | "query"; text: string };

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const { id, role, text } = event.data;
  try {
    const values = role === "query" ? await embedder.embedQuery(text) : await embedder.embed(text);
    self.postMessage({ id, values }, [values.buffer]);
  } catch (cause) {
    self.postMessage({ id, error: cause instanceof Error ? cause.message : "Embedding failed" });
  }
});
