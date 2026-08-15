import type { Knowledge } from "../../domain/entities/knowledge.entity.js";
import type { KnowledgeChanges, KnowledgeRepository } from "../../domain/repositories/knowledge.repository.js";
export declare class UpdateKnowledgeCommand {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(key: string, changes: KnowledgeChanges): Promise<Knowledge>;
}
//# sourceMappingURL=update-knowledge.command.d.ts.map