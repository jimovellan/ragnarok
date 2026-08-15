import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeChanges, KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";

export class UpdateKnowledgeCommand {
  constructor(private readonly repository: KnowledgeRepository) {}

  execute(key: string, changes: KnowledgeChanges): Promise<Knowledge> {
    return this.repository.updateByKey(key, changes);
  }
}
