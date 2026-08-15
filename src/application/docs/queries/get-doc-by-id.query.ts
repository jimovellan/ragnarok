import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";

export class GetDocByIdQuery {
  constructor(private readonly repository: DocRepository) {}

  execute(id: number): Promise<Doc | null> {
    return this.repository.getById(id);
  }
}
