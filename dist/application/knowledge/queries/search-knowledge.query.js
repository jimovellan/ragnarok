export class SearchKnowledgeQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(query, limit, tag, namespace) {
        return this.repository.search(query, limit, tag, namespace);
    }
}
//# sourceMappingURL=search-knowledge.query.js.map