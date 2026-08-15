import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";
export declare class GetDocByIdQuery {
    private readonly repository;
    constructor(repository: DocRepository);
    execute(id: number): Promise<Doc | null>;
}
//# sourceMappingURL=get-doc-by-id.query.d.ts.map