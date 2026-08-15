import type { DocSummary } from "../../../domain/entities/doc.entity.js";
import type { DocRepository } from "../../../domain/repositories/doc.repository.js";
export declare class SearchDocsQuery {
    private readonly repository;
    constructor(repository: DocRepository);
    execute(query: string, limit?: number, tag?: string): Promise<DocSummary[]>;
}
//# sourceMappingURL=search-docs.query.d.ts.map