export class GetDocByKeyQuery {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(key) {
        return this.repository.getByKey(key);
    }
}
//# sourceMappingURL=get-doc-by-key.query.js.map