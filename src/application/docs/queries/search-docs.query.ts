import type { DocSummary } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";

export class SearchDocsQuery {
  constructor(private readonly repository: DocRepository) {}

  execute(query: string, limit?: number, tag?: string): Promise<DocSummary[]> {
    return this.repository.search(query, limit, tag);
  }
}
