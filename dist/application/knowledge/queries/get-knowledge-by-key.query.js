export class GetKnowledgeByKeyQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(key) {
        return this.repository.getByKey(key);
    }
}
//# sourceMappingURL=get-knowledge-by-key.query.js.map