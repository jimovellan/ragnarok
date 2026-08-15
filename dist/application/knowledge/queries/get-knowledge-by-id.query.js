export class GetKnowledgeByIdQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(id) {
        return this.repository.getById(id);
    }
}
//# sourceMappingURL=get-knowledge-by-id.query.js.map