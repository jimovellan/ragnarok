import type { DocChunkMatch } from "../../../domain/entities/doc-chunk.entity.js";
import type { DocChunkRepository } from "../../../domain/repositories/doc-chunk.repository.js";

// The only chunk-level operation exposed to entry points: docs themselves store no content, so
// this is how callers actually see matched text (insert/update/remove are internal, driven by
// DocRepository whenever a doc's content changes).
export class SearchDocChunksQuery {
  constructor(private readonly repository: DocChunkRepository) {}

  execute(query: string, limit?: number, tag?: string): Promise<DocChunkMatch[]> {
    return this.repository.search(query, limit, tag);
  }
}
