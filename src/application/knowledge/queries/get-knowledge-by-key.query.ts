import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";

export class GetKnowledgeByKeyQuery {
  constructor(private readonly repository: KnowledgeRepository) {}

  execute(key: string): Promise<Knowledge | null> {
    return this.repository.getByKey(key);
  }
}
