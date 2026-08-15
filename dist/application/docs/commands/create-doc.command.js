export class CreateDocCommand {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(doc) {
        return this.repository.create(doc);
    }
}
//# sourceMappingURL=create-doc.command.js.map