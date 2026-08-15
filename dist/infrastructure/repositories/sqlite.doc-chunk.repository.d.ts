import type { DocChunk, DocChunkMatch } from "../../domain/entities/doc-chunk.entity.js";
import type { DocChunkRepository } from "../../domain/repositories/doc-chunk.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
export declare class SqliteDocChunkRepository implements DocChunkRepository {
    private readonly embedingService;
    private readonly db;
    constructor(embedingService: EmbedingService);
    insert(docKey: string, content: string): Promise<DocChunk[]>;
    search(query: string, limit?: number, tag?: string): Promise<DocChunkMatch[]>;
    update(docKey: string, content: string): Promise<DocChunk[]>;
    remove(docKey: string): Promise<void>;
    private insertChunkRows;
}
//# sourceMappingURL=sqlite.doc-chunk.repository.d.ts.map