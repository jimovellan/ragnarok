import type { Knowledge, KnowledgeSummary } from "../../domain/entities/knowledge.entity.js";
import type { KnowledgeChanges, KnowledgeRepository } from "../../domain/repositories/knowledge.repository.js";
import type { EmbedingService } from "../../domain/services/embbeding.service.js";
export declare class SqliteKnowledgeRepository implements KnowledgeRepository {
    private readonly embedingService;
    private readonly db;
    constructor(embedingService: EmbedingService);
    create(knowledge: Omit<Knowledge, "id" | "key" | "createdAt" | "updatedAt">): Promise<Knowledge>;
    search(query: string, limit?: number, tag?: string, namespace?: string): Promise<KnowledgeSummary[]>;
    listNamespaces(): Promise<string[]>;
    listTags(): Promise<string[]>;
    getById(id: number): Promise<Knowledge | null>;
    getByKey(key: string): Promise<Knowledge | null>;
    updateById(id: number, changes: KnowledgeChanges): Promise<Knowledge>;
    updateByKey(key: string, changes: KnowledgeChanges): Promise<Knowledge>;
    private updateAndRefreshEmbedding;
    removeById(id: number): Promise<void>;
    removeByKey(key: string): Promise<void>;
}
//# sourceMappingURL=sqlite.knowledge.repository.d.ts.map