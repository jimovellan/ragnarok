export interface DocChunk {
    id: number;
    docKey: string;
    chunkIndex: number;
    content: string;
    createdAt: Date;
}
export type DocChunkMatch = Pick<DocChunk, "docKey" | "chunkIndex" | "content"> & {
    docTitle: string;
    docReference: string;
    docPath: string;
    docTag: string;
};
//# sourceMappingURL=doc-chunk.entity.d.ts.map