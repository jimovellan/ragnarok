export interface Knowledge {
  id: number;
  key: string;
  title: string;
  tag: string;
  namespace: string;
  summary: string;
  content: string;
  // Pointer to the original source (e.g. a PDF path/URL) when the entry is managed content
  // rather than freeform notes.
  reference: string;
  // When false, `content` is not persisted (kept as ""): only title/summary/reference are
  // stored, e.g. for a PDF content manager where the PDF itself is the source of truth.
  // Content passed in at create/update time is still used to generate embeddings either way.
  storeContent: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  active: boolean;
}

// Lightweight projection returned by search results, before fetching the full record via getById/getByKey.
export type KnowledgeSummary = Pick<
  Knowledge,
  "id" | "key" | "title" | "tag" | "namespace" | "summary" | "reference"
>;