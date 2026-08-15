import type { Doc } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";
export declare class GetDocByKeyQuery {
    private readonly repository;
    constructor(repository: DocRepository);
    execute(key: string): Promise<Doc | null>;
}
//# sourceMappingURL=get-doc-by-key.query.d.ts.map