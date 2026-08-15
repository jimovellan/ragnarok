import type { Knowledge } from "../../../domain/entities/knowledge.entity.js";
import type { KnowledgeRepository } from "../../../domain/repositories/knowledge.repository.js";

export class GetKnowledgeByIdQuery {
  constructor(private readonly repository: KnowledgeRepository) {}

  execute(id: number): Promise<Knowledge | null> {
    return this.repository.getById(id);
  }
}
