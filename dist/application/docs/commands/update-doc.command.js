export class UpdateDocCommand {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(key, changes) {
        return this.repository.updateByKey(key, changes);
    }
}
//# sourceMappingURL=update-doc.command.js.map