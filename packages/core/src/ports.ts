import type { Folder, Note } from "@echo/types";

/** Fields a repository may change after insert. Identity and creation time are immutable. */
export type NotePatch = Partial<Pick<Note, "title" | "content" | "folderId" | "archivedAt">> & {
  updatedAt: Date;
};

export type NoteListOptions = {
  /** `undefined` lists every folder, `null` lists the Inbox. */
  folderId?: string | null;
  includeArchived?: boolean;
  limit?: number;
};

export interface NoteRepository {
  insert(note: Note): Promise<Note>;
  update(id: string, patch: NotePatch): Promise<Note>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Note | null>;
  list(options?: NoteListOptions): Promise<Note[]>;
}

export type FolderPatch = Partial<Pick<Folder, "name" | "parentId">> & { updatedAt: Date };

export interface FolderRepository {
  insert(folder: Folder): Promise<Folder>;
  update(id: string, patch: FolderPatch): Promise<Folder>;
  /** Children are removed with the parent; notes inside fall back to the Inbox. */
  delete(id: string): Promise<void>;
  get(id: string): Promise<Folder | null>;
  list(): Promise<Folder[]>;
}

export type StoredEmbedding = {
  noteId: string;
  model: string;
  values: Float32Array;
};

export interface EmbeddingRepository {
  put(embedding: StoredEmbedding): Promise<void>;
  list(model: string): Promise<StoredEmbedding[]>;
  /** Notes with no vector, a stale vector, or one from a different model. */
  pending(model: string): Promise<string[]>;
}

export type LexicalMatch = { noteId: string; rank: number };

export interface LexicalSearch {
  search(query: string, limit?: number): Promise<LexicalMatch[]>;
}

export type Repositories = {
  notes: NoteRepository;
  folders: FolderRepository;
  embeddings: EmbeddingRepository;
};
