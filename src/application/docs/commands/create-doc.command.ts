import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocMetadata, DocRepository } from "../../../domain/repositories/doc.repository.js";

export class CreateDocCommand {
  constructor(private readonly repository: DocRepository) {}

  execute(doc: DocMetadata & { content: string }): Promise<Doc> {
    return this.repository.create(doc);
  }
}
