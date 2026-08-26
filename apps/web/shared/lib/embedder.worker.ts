/// <reference lib="webworker" />

import type { EmbedderStatus } from "@echo/embeddings";
import { createLocalEmbedder } from "@echo/embeddings/local";

/**
 * The model runs here and nowhere else. Downloading it, holding it in memory and running it are all
 * off the main thread, so none of it can ever cost the writer a keystroke.
 */
const embedder = createLocalEmbedder({
  runtimePath: "/ort/",
  onStatus: (status) => self.postMessage({ kind: "status", status } satisfies StatusMessage),
});

type Request =
  | { kind: "embed"; id: number; role: "passage" | "query"; text: string }
  | { kind: "warm" };

type StatusMessage = { kind: "status"; status: EmbedderStatus };

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const request = event.data;

  // Loading the weights before anything is asked of them: the first search should not be the thing
  // that discovers a 120MB download.
  if (request.kind === "warm") {
    await embedder.warm?.().catch(() => {});
    return;
  }

  const { id, role, text } = request;
  try {
    const values = role === "query" ? await embedder.embedQuery(text) : await embedder.embed(text);
    self.postMessage({ kind: "result", id, values }, [values.buffer]);
  } catch (cause) {
    self.postMessage({
      kind: "result",
      id,
      error: cause instanceof Error ? cause.message : "Embedding failed",
    });
  }
});
