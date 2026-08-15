import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocChanges, DocRepository } from "../../../domain/repositories/doc.repository.js";
export declare class UpdateDocCommand {
    private readonly repository;
    constructor(repository: DocRepository);
    execute(key: string, changes: DocChanges): Promise<Doc>;
}
//# sourceMappingURL=update-doc.command.d.ts.map