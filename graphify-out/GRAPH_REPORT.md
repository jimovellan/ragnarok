# Graph Report - rag  (2026-08-02)

## Corpus Check
- 33 files · ~9,436 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 152 nodes · 328 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `Knowledge` - 26 edges
2. `KnowledgeRepository` - 19 edges
3. `PostgresKnowledgeRepository` - 15 edges
4. `SqliteKnowledgeRepository` - 15 edges
5. `KnowledgeChanges` - 13 edges
6. `EmbedingService` - 9 edges
7. `KnowledgeSummary` - 8 edges
8. `config` - 7 edges
9. `toKnowledge()` - 7 edges
10. `findKnowledge()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `runMigrations()`  [INFERRED]
  scripts/seed.mjs → src/infrastructure/migrations/run-migrations.ts
- `PostgresKnowledgeRepository` --implements--> `KnowledgeRepository`  [EXTRACTED]
  src/infrastructure/repositories/postgres.knowledge.repository.ts → src/domain/repositories/knowledge.repository.ts
- `SqliteKnowledgeRepository` --implements--> `KnowledgeRepository`  [EXTRACTED]
  src/infrastructure/repositories/sqlite.knowledge.repository.ts → src/domain/repositories/knowledge.repository.ts
- `runStepForm()` --calls--> `textPrompt()`  [EXTRACTED]
  src/commands/ui.command.ts → src/infrastructure/console/prompt.ts
- `runCreateFlow()` --calls--> `viewScreen()`  [EXTRACTED]
  src/commands/ui.command.ts → src/infrastructure/console/prompt.ts

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (17): registerHttpCommand(), registerMcpCommand(), registerUiCommand(), getVersion(), PACKAGE_JSON_PATH, buildOpenApiSpec(), errorSchema, knowledgeSchema (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (10): KnowledgeChanges, cosineDistance(), significantWords(), wordPatterns(), buildSetClause(), KnowledgeRow, KnowledgeVectorRow, SqliteKnowledgeRepository (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (17): describeKnowledge(), findKnowledge(), FORM_FIELDS, FormField, FormValues, MainMenuChoice, runCreateFlow(), runSearchFlow() (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (4): Knowledge, buildSetClause(), PostgresKnowledgeRepository, toKnowledge()

### Community 6 - "Community 6"
Cohesion: 0.40
Nodes (4): ENV_PATH, pool, repository, updateCommand

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (7): CreateKnowledgeCommand, UpdateKnowledgeCommand, KnowledgeSummary, GetKnowledgeByIdQuery, GetKnowledgeByKeyQuery, SearchKnowledgeQuery, KnowledgeRepository

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (4): ENV_PATH, fails, searchQuery, TESTS

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (9): VectorEmbeddingService, LocalTransformersEmbeddingService, KnowledgeRow, KnowledgeSummaryRow, UPDATABLE_COLUMN_BY_FIELD, EmbedingService, config, DbEngine (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (4): buildEntries(), CATEGORIES, ENV_PATH, main()

## Knowledge Gaps
- **32 isolated node(s):** `ENV_PATH`, `searchQuery`, `TESTS`, `fails`, `ENV_PATH` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KnowledgeRepository` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 9`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `Knowledge` connect `Community 3` to `Community 9`, `Community 2`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `SqliteKnowledgeRepository` connect `Community 1` to `Community 9`, `Community 7`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `ENV_PATH`, `searchQuery`, `TESTS` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._