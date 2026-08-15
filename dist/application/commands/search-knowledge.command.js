export class SearchKnowledgeCommand {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    execute(query, limit, tag, project) {
        return this.repository.search(query, limit, tag, project);
    }
}
//# sourceMappingURL=search-knowledge.command.js.map