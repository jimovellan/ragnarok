import type { DocChunk, DocChunkMatch } from "../entities/doc-chunk.entity.js";

// Owns the doc_vectors table: chunking, embedding, and semantic search over doc content.
// DocRepository implementations depend on this rather than touching doc_vectors directly.
export interface DocChunkRepository {
  // Splits content into chunks, embeds each one, and inserts a row per chunk for the doc.
  insert(docKey: string, content: string): Promise<DocChunk[]>;
  // Semantic + literal search across chunk content, optionally scoped by the parent doc's tag.
  search(query: string, limit?: number, tag?: string): Promise<DocChunkMatch[]>;
  // Replaces every chunk belonging to a doc with freshly chunked/embedded content.
  update(docKey: string, content: string): Promise<DocChunk[]>;
  // Removes every chunk belonging to a doc.
  remove(docKey: string): Promise<void>;
}
