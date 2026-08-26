# @echo/learning

What echo has worked out about the reader, as pure functions over things the reader did. Three
independent models, none of which needs a network, a model file or an API key:

- **`rules.ts`** — corrections in, beliefs out. Derived on every read and never stored, so "forget
  this" is a delete rather than a flag something else might still consult.
- **`phrases.ts`** — how this reader writes, as word and pair counts, for finishing a sentence they
  have written before and for naming the phrases they build around a word.
- **`vocabulary.ts`** — which words they use, which they use near each other, and which they use in
  the same places. The last one is what makes `HEREZE` and `Deadlands` retrieve one another.

Aliases are decided by near-exclusive usage rather than by similarity: measured on a real corpus, a
word written beside all of someone's spellings for a thing keeps *better* company with each of them
than they keep with each other. What identifies a synonym is that it is the word they reach for
instead, so the two hardly ever share a note. See the constants in `vocabulary.ts`, which say so at
the point where it matters.
