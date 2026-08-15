import type { DocChunk, DocChunkMatch } from "../entities/doc-chunk.entity.js";
export interface DocChunkRepository {
    insert(docKey: string, content: string): Promise<DocChunk[]>;
    search(query: string, limit?: number, tag?: string): Promise<DocChunkMatch[]>;
    update(docKey: string, content: string): Promise<DocChunk[]>;
    remove(docKey: string): Promise<void>;
}
//# sourceMappingURL=doc-chunk.repository.d.ts.map