export interface Doc {
    id: number;
    key: string;
    docReference: string;
    path: string;
    title: string;
    summary: string;
    tag: string;
    createdAt: Date;
    updatedAt: Date;
}
export type DocSummary = Pick<Doc, "id" | "key" | "docReference" | "path" | "title" | "summary" | "tag">;
//# sourceMappingURL=doc.entity.d.ts.map