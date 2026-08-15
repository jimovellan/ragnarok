import type { Doc, DocSummary } from "../entities/doc.entity.js";

export type DocMetadata = Pick<Doc, "docReference" | "path" | "title" | "summary" | "tag">;

// content is required on create and optional on update: when provided, it replaces the doc's
// chunks in doc_vectors (re-split, re-embedded) — the docs table itself never stores content.
export type DocChanges = Partial<DocMetadata> & { content?: string };

export interface DocRepository {
  create(doc: DocMetadata & { content: string }): Promise<Doc>;
  search(query: string, limit?: number, tag?: string): Promise<DocSummary[]>;
  listTags(): Promise<string[]>;
  getById(id: number): Promise<Doc | null>;
  getByKey(key: string): Promise<Doc | null>;
  updateById(id: number, changes: DocChanges): Promise<Doc>;
  updateByKey(key: string, changes: DocChanges): Promise<Doc>;
  removeById(id: number): Promise<void>;
  removeByKey(key: string): Promise<void>;
}
