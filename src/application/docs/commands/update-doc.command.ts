import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocChanges, DocRepository } from "../../../domain/repositories/doc.repository.js";

export class UpdateDocCommand {
  constructor(private readonly repository: DocRepository) {}

  execute(key: string, changes: DocChanges): Promise<Doc> {
    return this.repository.updateByKey(key, changes);
  }
}
