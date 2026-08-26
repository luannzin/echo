# @echo/search

Ranking and suggestion, as pure functions. No IO, no React, no model — callers hand it signals that
have already been measured, and it decides the order.

- **`ranking.ts`** — the blend. Five signals: meaning (0.45), words (0.22), context (0.18), recency
  (0.08), habit (0.07). Coefficients are configuration a test can pin down, never something buried
  in a component.
- **`context.ts`** — how much a note belongs to what is being asked about, beyond what it says: the
  same project, the notes the reader opens beside it, shared concepts, the same fortnight. This
  exists because meaning alone puts the wrong note first: one note can be almost exactly about the
  same words as another and still not be the one you meant. Every part of it can be named back to
  the reader as a sentence about their own notes, which `explainContext` does.
- **`destinations.ts` · `categories.ts`** — where a note belongs and what it is about, decided by a
  vote among the notes nearest it. No classifier: the corpus is the model, and the reason is a list
  of notes rather than a score.
- **`vector-index.ts`** — every embedding resident in one contiguous `Float32Array`, compared in
  place.
