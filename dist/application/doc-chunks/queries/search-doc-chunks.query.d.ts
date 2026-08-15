import type { DocChunkMatch } from "../../../domain/entities/doc-chunk.entity.js";
import type { DocChunkRepository } from "../../../domain/repositories/doc-chunk.repository.js";
export declare class SearchDocChunksQuery {
    private readonly repository;
    constructor(repository: DocChunkRepository);
    execute(query: string, limit?: number, tag?: string): Promise<DocChunkMatch[]>;
}
//# sourceMappingURL=search-doc-chunks.query.d.ts.map