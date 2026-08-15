export class GetDocByIdQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(id) {
        return this.repository.getById(id);
    }
}
//# sourceMappingURL=get-doc-by-id.query.js.map