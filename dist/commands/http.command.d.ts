import type { Command } from 'commander';
import type { KnowledgeRepository } from '../domain/repositories/knowledge.repository.js';
import type { DocRepository } from '../domain/repositories/doc.repository.js';
import type { DocChunkRepository } from '../domain/repositories/doc-chunk.repository.js';
/**
 * Registers the 'http' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'http' command will be added.
 * @param repository - The knowledge repository instance.
 * @param docRepository - The doc repository instance.
 * @param docChunkRepository - The doc chunk repository instance, for content-level search.
 */
export declare function registerHttpCommand(program: Command, repository: KnowledgeRepository, docRepository: DocRepository, docChunkRepository: DocChunkRepository): void;
//# sourceMappingURL=http.command.d.ts.map