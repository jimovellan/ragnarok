import type { Knowledge } from "../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../domain/repositories/knowledge.repository.js";
export declare class SearchKnowledgeCommand {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(query: string, limit?: number, tag?: string, project?: string): Promise<Knowledge[]>;
}
//# sourceMappingURL=search-knowledge.command.d.ts.map