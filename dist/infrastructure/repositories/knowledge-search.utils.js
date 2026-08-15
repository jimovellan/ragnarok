// Shared between the Postgres and SQLite repositories so both engines search with the
// same calibration instead of drifting apart. See postgres.knowledge.repository.ts history
// for how this value and the AND-word-matching strategy were chosen.
// 0.5 vs 0.55 tie on the eval battery (42/45), but 0.55 avoids returning zero results for
// vaguer queries (e.g. "cita médica", whose closest match sits at 0.53) at no extra cost.
export const MAX_VECTOR_DISTANCE = 0.55;
// Splits a query into significant words (>= 3 chars); a literal match requires ALL of them to
// be present (AND), which avoids a single generic word pulling in every row that contains it.
export function significantWords(query) {
    const words = query
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3);
    return words.length > 0 ? words : [query.trim()];
}
export function cosineDistance(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i] ?? 0;
        const bi = b[i] ?? 0;
        dot += ai * bi;
        normA += ai * ai;
        normB += bi * bi;
    }
    return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
//# sourceMappingURL=knowledge-search.utils.js.map