import type { EmbedingService } from "../../../domain/services/embbeding.service.js";
import { config } from "../../../config.js";

export class VectorEmbeddingService implements EmbedingService {
  async generate(text: string): Promise<number[]> {
    const response = await fetch(`${config.ollamaBaseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ollamaEmbeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }
}
