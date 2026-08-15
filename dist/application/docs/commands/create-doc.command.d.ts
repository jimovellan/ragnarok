import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocMetadata, DocRepository } from "../../../domain/repositories/doc.repository.js";
export declare class CreateDocCommand {
    private readonly repository;
    constructor(repository: DocRepository);
    execute(doc: DocMetadata & {
        content: string;
    }): Promise<Doc>;
}
//# sourceMappingURL=create-doc.command.d.ts.map