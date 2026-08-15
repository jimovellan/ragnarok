import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";
export declare class CreateKnowledgeCommand {
    private readonly repository;
    constructor(repository: KnowledgeRepository);
    execute(knowledge: Omit<Knowledge, "id" | "key" | "createdAt" | "updatedAt">): Promise<Knowledge>;
}
//# sourceMappingURL=create-knowledge.command.d.ts.map