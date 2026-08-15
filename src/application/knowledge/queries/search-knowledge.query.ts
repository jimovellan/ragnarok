import type { KnowledgeSummary } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";

export class SearchKnowledgeQuery {
  constructor(private readonly repository: KnowledgeRepository) {}

  execute(query: string, limit?: number, tag?: string, namespace?: string): Promise<KnowledgeSummary[]> {
    return this.repository.search(query, limit, tag, namespace);
  }
}
