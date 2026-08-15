export interface Knowledge {
    id: number;
    key: string;
    title: string;
    tag: string;
    namespace: string;
    summary: string;
    content: string;
    reference: string;
    storeContent: boolean;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    active: boolean;
}
export type KnowledgeSummary = Pick<Knowledge, "id" | "key" | "title" | "tag" | "namespace" | "summary" | "reference">;
//# sourceMappingURL=knowledge.entity.d.ts.map