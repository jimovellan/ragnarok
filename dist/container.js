import { PostgresKnowledgeRepository } from './infrastructure/repositories/postgres.knowledge.repository.js';
import { SqliteKnowledgeRepository } from './infrastructure/repositories/sqlite.knowledge.repository.js';
import { PostgresDocRepository } from './infrastructure/repositories/postgres.doc.repository.js';
import { PostgresDocChunkRepository } from './infrastructure/repositories/postgres.doc-chunk.repository.js';
import { SqliteDocRepository } from './infrastructure/repositories/sqlite.doc.repository.js';
import { SqliteDocChunkRepository } from './infrastructure/repositories/sqlite.doc-chunk.repository.js';
import { LocalTransformersEmbeddingService } from './infrastructure/services/embedings/local-transformers.embedding.service.js';
import { config } from './config.js';
const embedingService = new LocalTransformersEmbeddingService();
const knowledgeRepository = config.dbEngine === 'sqlite'
    ? new SqliteKnowledgeRepository(embedingService)
    : new PostgresKnowledgeRepository(embedingService);
const docChunkRepository = config.dbEngine === 'sqlite'
    ? new SqliteDocChunkRepository(embedingService)
    : new PostgresDocChunkRepository(embedingService);
const docRepository = config.dbEngine === 'sqlite'
    ? new SqliteDocRepository(embedingService, docChunkRepository)
    : new PostgresDocRepository(embedingService, docChunkRepository);
export const container = {
    knowledgeRepository,
    searchRepository: knowledgeRepository,
    docRepository,
    docChunkRepository,
};
//# sourceMappingURL=container.js.map