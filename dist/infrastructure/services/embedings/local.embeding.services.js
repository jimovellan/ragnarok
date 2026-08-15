import { config } from "../../../config.js";
export class VectorEmbeddingService {
    async generate(text) {
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
        const data = (await response.json());
        return data.embedding;
    }
}
//# sourceMappingURL=local.embeding.services.js.map