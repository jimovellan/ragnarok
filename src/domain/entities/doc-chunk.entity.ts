export interface DocChunk {
  id: number;
  docKey: string;
  chunkIndex: number;
  content: string;
  createdAt: Date;
}

// A chunk search result carries enough of the parent doc to be useful without a second lookup —
// docs themselves store no content, so this is the only place matched text actually surfaces.
export type DocChunkMatch = Pick<DocChunk, "docKey" | "chunkIndex" | "content"> & {
  docTitle: string;
  docReference: string;
  docPath: string;
  docTag: string;
};
