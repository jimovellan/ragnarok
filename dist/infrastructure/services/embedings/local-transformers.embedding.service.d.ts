import type { EmbedingService } from "../../../domain/services/embbeding.service.js";
export declare class LocalTransformersEmbeddingService implements EmbedingService {
    private extractorPromise;
    private getExtractor;
    generate(text: string): Promise<number[]>;
}
//# sourceMappingURL=local-transformers.embedding.service.d.ts.map