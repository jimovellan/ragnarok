import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";
export declare class GetKnowledgeByIdQuery {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(id: number): Promise<Knowledge | null>;
}
//# sourceMappingURL=get-knowledge-by-id.query.d.ts.map