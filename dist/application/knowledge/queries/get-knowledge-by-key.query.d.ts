import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";
export declare class GetKnowledgeByKeyQuery {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(key: string): Promise<Knowledge | null>;
}
//# sourceMappingURL=get-knowledge-by-key.query.d.ts.map