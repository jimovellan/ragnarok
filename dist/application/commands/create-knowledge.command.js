export class CreateKnowledgeCommand {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(knowledge) {
        return this.repository.create(knowledge);
    }
}
//# sourceMappingURL=create-knowledge.command.js.map