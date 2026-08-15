export interface Doc {
  id: number;
  key: string;
  docReference: string;
  path: string;
  title: string;
  summary: string;
  tag: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lightweight projection returned by search results.
export type DocSummary = Pick<Doc, "id" | "key" | "docReference" | "path" | "title" | "summary" | "tag">;
