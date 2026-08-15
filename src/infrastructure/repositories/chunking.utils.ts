// Shared between the Postgres and SQLite repositories: splits large content into overlapping
// chunks so each one stays within embedding-model input limits. Each chunk gets its own row in
// knowledge_vectors (the schema already allows multiple vector rows per knowledge_key), and
// search matches against whichever chunk is closest. Content under maxChars comes back as a
// single chunk, unchanged, so small entries are unaffected.
export function chunkText(text: string, maxChars: number, overlapChars: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + maxChars, trimmed.length);
    if (end < trimmed.length) {
      const boundary = trimmed.lastIndexOf(" ", end);
      if (boundary > start) {
        end = boundary;
      }
    }

    const chunk = trimmed.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= trimmed.length) {
      break;
    }
    // Always advance past the previous chunk's start, even if overlapChars >= the chunk
    // length, so the loop can't stall on pathological inputs.
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

// Prepends title/summary to each content chunk so its embedding carries context even when the
// chunk, read alone, would be ambiguous.
export function buildChunkTexts(
  knowledge: { title: string; summary: string; content: string },
  maxChars: number,
  overlapChars: number,
): string[] {
  const header = [knowledge.title, knowledge.summary].filter(Boolean).join("\n");
  return chunkText(knowledge.content, maxChars, overlapChars).map((chunk) =>
    header ? `${header}\n${chunk}` : chunk,
  );
}
