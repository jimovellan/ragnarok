export class SearchDocsQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(query, limit, tag) {
        return this.repository.search(query, limit, tag);
    }
}
//# sourceMappingURL=search-docs.query.js.map