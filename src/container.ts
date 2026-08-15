import type { KnowledgeRepository } from './domain/repositories/knowledge.repository.js';
import type { DocRepository } from './domain/repositories/doc.repository.js';
import type { DocChunkRepository } from './domain/repositories/doc-chunk.repository.js';
import { PostgresKnowledgeRepository } from './infrastructure/repositories/postgres.knowledge.repository.js';
import { SqliteKnowledgeRepository } from './infrastructure/repositories/sqlite.knowledge.repository.js';
import { PostgresDocRepository } from './infrastructure/repositories/postgres.doc.repository.js';
import { PostgresDocChunkRepository } from './infrastructure/repositories/postgres.doc-chunk.repository.js';
import { SqliteDocRepository } from './infrastructure/repositories/sqlite.doc.repository.js';
import { SqliteDocChunkRepository } from './infrastructure/repositories/sqlite.doc-chunk.repository.js';
import { LocalTransformersEmbeddingService } from './infrastructure/services/embedings/local-transformers.embedding.service.js';
import { config } from './config.js';

const embedingService = new LocalTransformersEmbeddingService();
const knowledgeRepository: KnowledgeRepository =
    config.dbEngine === 'sqlite'
        ? new SqliteKnowledgeRepository(embedingService)
        : new PostgresKnowledgeRepository(embedingService);

const docChunkRepository: DocChunkRepository =
    config.dbEngine === 'sqlite'
        ? new SqliteDocChunkRepository(embedingService)
        : new PostgresDocChunkRepository(embedingService);

const docRepository: DocRepository =
    config.dbEngine === 'sqlite'
        ? new SqliteDocRepository(embedingService, docChunkRepository)
        : new PostgresDocRepository(embedingService, docChunkRepository);

export const container = {
    knowledgeRepository,
    searchRepository: knowledgeRepository,
    docRepository,
    docChunkRepository,
};
