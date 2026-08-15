import type { KnowledgeSummary } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";
export declare class SearchKnowledgeQuery {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(query: string, limit?: number, tag?: string, namespace?: string): Promise<KnowledgeSummary[]>;
}
//# sourceMappingURL=search-knowledge.query.d.ts.map