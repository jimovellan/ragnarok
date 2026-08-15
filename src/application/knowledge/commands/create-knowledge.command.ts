import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";

export class CreateKnowledgeCommand {
  constructor(private readonly repository: KnowledgeRepository) {}

  execute(knowledge: Omit<Knowledge, "id" | "key" | "createdAt" | "updatedAt">): Promise<Knowledge> {
    return this.repository.create(knowledge);
  }
}
