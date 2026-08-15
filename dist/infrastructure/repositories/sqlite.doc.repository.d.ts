import type { Doc, DocSummary } from "../../domain/entities/doc.entity.js";
import type { DocChanges, DocMetadata, DocRepository } from "../../domain/repositories/doc.repository.js";
import type { DocChunkRepository } from "../../domain/repositories/doc-chunk.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
export declare class SqliteDocRepository implements DocRepository {
    private readonly embedingService;
    private readonly docChunkRepository;
    private readonly db;
    constructor(embedingService: EmbedingService, docChunkRepository: DocChunkRepository);
    create(doc: DocMetadata & {
        content: string;
    }): Promise<Doc>;
    search(query: string, limit?: number, tag?: string): Promise<DocSummary[]>;
    listTags(): Promise<string[]>;
    getById(id: number): Promise<Doc | null>;
    getByKey(key: string): Promise<Doc | null>;
    updateById(id: number, changes: DocChanges): Promise<Doc>;
    updateByKey(key: string, changes: DocChanges): Promise<Doc>;
    private updateAndRefreshChunks;
    removeById(id: number): Promise<void>;
    removeByKey(key: string): Promise<void>;
}
//# sourceMappingURL=sqlite.doc.repository.d.ts.map