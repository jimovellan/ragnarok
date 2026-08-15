export class UpdateKnowledgeCommand {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(key, changes) {
        return this.repository.updateByKey(key, changes);
    }
}
//# sourceMappingURL=update-knowledge.command.js.map