import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import type { EmbedingService } from "../../../domain/services/embbeding.service.js";

const MODEL = "Xenova/paraphrase-multilingual-mpnet-base-v2";

// In-process embeddings via transformers.js — no external Ollama server required.
// The model is loaded once (lazily, on first use) and reused for every subsequent call.
export class LocalTransformersEmbeddingService implements EmbedingService {
  private extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

  private getExtractor(): Promise<FeatureExtractionPipeline> {
    this.extractorPromise ??= pipeline("feature-extraction", MODEL);
    return this.extractorPromise;
  }

  async generate(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  }
}
