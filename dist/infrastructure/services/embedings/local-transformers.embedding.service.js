import { pipeline } from "@huggingface/transformers";
const MODEL = "Xenova/paraphrase-multilingual-mpnet-base-v2";
// In-process embeddings via transformers.js — no external Ollama server required.
// The model is loaded once (lazily, on first use) and reused for every subsequent call.
export class LocalTransformersEmbeddingService {
    extractorPromise;
    getExtractor() {
        this.extractorPromise ??= pipeline("feature-extraction", MODEL);
        return this.extractorPromise;
    }
    async generate(text) {
        const extractor = await this.getExtractor();
        const output = await extractor(text, { pooling: "mean", normalize: true });
        return Array.from(output.data);
    }
}
//# sourceMappingURL=local-transformers.embedding.service.js.map