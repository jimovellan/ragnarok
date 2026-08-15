import type { Knowledge, KnowledgeSummary } from "../entities/knowledge.entity.js";
export type KnowledgeChanges = Partial<Pick<Knowledge, 'title' | 'tag' | 'namespace' | 'summary' | 'content' | 'reference' | 'storeContent' | 'version' | 'active'>>;
export interface KnowledgeRepository {
    create(knowledge: Omit<Knowledge, 'id' | 'key' | 'createdAt' | 'updatedAt'>): Promise<Knowledge>;
    search(query: string, limit?: number, tag?: string, namespace?: string): Promise<KnowledgeSummary[]>;
    listNamespaces(): Promise<string[]>;
    listTags(): Promise<string[]>;
    getById(id: number): Promise<Knowledge | null>;
    getByKey(key: string): Promise<Knowledge | null>;
    updateById(id: number, changes: KnowledgeChanges): Promise<Knowledge>;
    updateByKey(key: string, changes: KnowledgeChanges): Promise<Knowledge>;
    removeById(id: number): Promise<void>;
    removeByKey(key: string): Promise<void>;
}
//# sourceMappingURL=knowledge.repository.d.ts.map