// The only chunk-level operation exposed to entry points: docs themselves store no content, so
// this is how callers actually see matched text (insert/update/remove are internal, driven by
// DocRepository whenever a doc's content changes).
export class SearchDocChunksQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(query, limit, tag) {
        return this.repository.search(query, limit, tag);
    }
}
//# sourceMappingURL=search-doc-chunks.query.js.map