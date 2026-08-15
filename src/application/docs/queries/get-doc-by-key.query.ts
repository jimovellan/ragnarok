import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";

export class GetDocByKeyQuery {
  constructor(private readonly repository: DocRepository) {}

  execute(key: string): Promise<Doc | null> {
    return this.repository.getByKey(key);
  }
}
