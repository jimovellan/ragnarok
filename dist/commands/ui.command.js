import { CreateKnowledgeCommand } from "../application/knowledge/commands/create-knowledge.command.js";
import { UpdateKnowledgeCommand } from "../application/knowledge/commands/update-knowledge.command.js";
import { GetKnowledgeByKeyQuery } from "../application/knowledge/queries/get-knowledge-by-key.query.js";
import { SearchKnowledgeQuery } from "../application/knowledge/queries/search-knowledge.query.js";
import { CreateDocCommand } from "../application/docs/commands/create-doc.command.js";
import { UpdateDocCommand } from "../application/docs/commands/update-doc.command.js";
import { GetDocByKeyQuery } from "../application/docs/queries/get-doc-by-key.query.js";
import { SearchDocsQuery } from "../application/docs/queries/search-docs.query.js";
import { SearchDocChunksQuery } from "../application/doc-chunks/queries/search-doc-chunks.query.js";
import { BACK, selectPrompt, textPrompt, viewScreen } from "../infrastructure/console/prompt.js";
import { runMigrations } from "../infrastructure/migrations/run-migrations.js";
const FORM_FIELDS = [
    { key: "title", label: "Título" },
    { key: "tag", label: "Tag" },
    { key: "summary", label: "Resumen" },
    { key: "content", label: "Contenido" },
    { key: "reference", label: "Referencia (URL o ruta, opcional)" },
];
/** Walks the fields one at a time; Esc on a field steps back to the previous one, Esc on the first exits to the caller. */
async function runStepForm(initialValues) {
    const values = { ...initialValues };
    let step = 0;
    while (step < FORM_FIELDS.length) {
        const field = FORM_FIELDS[step];
        if (!field)
            break;
        const result = await textPrompt(`${field.label}:`, values[field.key]);
        if (result === BACK) {
            if (step === 0)
                return BACK;
            step -= 1;
            continue;
        }
        values[field.key] = result;
        step += 1;
    }
    return values;
}
/** Esc keeps the current value (used as the default when re-editing an existing entry). */
async function runStoreContentPrompt(current) {
    const choice = await selectPrompt("¿Guardar el contenido tal cual (además de usarlo para el embedding)?", [
        { label: "Sí", value: true },
        { label: "No (solo título/resumen/referencia)", value: false },
    ]);
    return choice === BACK ? current : choice;
}
function describeKnowledge(knowledge) {
    return [
        `Título: ${knowledge.title}`,
        `Tag: ${knowledge.tag}`,
        `Namespace: ${knowledge.namespace}`,
        `Referencia: ${knowledge.reference}`,
        `Versión: ${knowledge.version}  Activo: ${knowledge.active ? "sí" : "no"}  Guarda contenido: ${knowledge.storeContent ? "sí" : "no"}`,
        "",
        `Resumen: ${knowledge.summary}`,
        "",
        "Contenido:",
        knowledge.storeContent ? knowledge.content : "(no almacenado; solo se usó para el embedding)",
    ];
}
async function runCreateFlow(namespace, createCommand) {
    const values = await runStepForm({ title: "", tag: "", summary: "", content: "", reference: "" });
    if (values === BACK)
        return;
    const storeContent = await runStoreContentPrompt(true);
    const knowledge = await createCommand.execute({ ...values, namespace, storeContent, version: 1, active: true });
    await viewScreen(["Creado correctamente.", "", ...describeKnowledge(knowledge)]);
}
/** Query -> results list -> selection. Esc on the list re-prompts the query; Esc on the query returns BACK. */
async function findKnowledge(namespace, searchQuery, getByKeyQuery) {
    let query = "";
    while (true) {
        const queryResult = await textPrompt("Buscar:", query);
        if (queryResult === BACK)
            return BACK;
        query = queryResult;
        const results = await searchQuery.execute(query, 10, undefined, namespace);
        if (results.length === 0) {
            await viewScreen(["No se encontraron resultados."]);
            continue;
        }
        const choice = await selectPrompt("Resultados:", results.map((summary) => ({ label: `${summary.title} [${summary.tag}]`, value: summary })));
        if (choice === BACK)
            continue;
        const knowledge = await getByKeyQuery.execute(choice.key);
        if (!knowledge) {
            await viewScreen(["No se pudo cargar el elemento seleccionado."]);
            continue;
        }
        return knowledge;
    }
}
async function runUpdateForm(knowledge, updateCommand) {
    const values = await runStepForm({
        title: knowledge.title,
        tag: knowledge.tag,
        summary: knowledge.summary,
        content: knowledge.content,
        reference: knowledge.reference,
    });
    if (values === BACK)
        return;
    const storeContent = await runStoreContentPrompt(knowledge.storeContent);
    const updated = await updateCommand.execute(knowledge.key, { ...values, storeContent });
    await viewScreen(["Actualizado correctamente.", "", ...describeKnowledge(updated)]);
}
async function runSearchFlow(namespace, searchQuery, getByKeyQuery, updateCommand) {
    while (true) {
        const knowledge = await findKnowledge(namespace, searchQuery, getByKeyQuery);
        if (knowledge === BACK)
            return;
        const action = await selectPrompt(describeKnowledge(knowledge).join("\n"), [
            { label: "Actualizar este elemento", value: "update" },
        ]);
        if (action === "update") {
            await runUpdateForm(knowledge, updateCommand);
        }
    }
}
async function runUpdateFlow(namespace, searchQuery, getByKeyQuery, updateCommand) {
    const knowledge = await findKnowledge(namespace, searchQuery, getByKeyQuery);
    if (knowledge === BACK)
        return;
    await runUpdateForm(knowledge, updateCommand);
}
const DOC_FORM_FIELDS = [
    { key: "title", label: "Título" },
    { key: "tag", label: "Tag" },
    { key: "docReference", label: "Referencia (doc_reference)" },
    { key: "path", label: "Ruta" },
    { key: "summary", label: "Resumen" },
    { key: "content", label: "Contenido" },
];
/** Same step-by-step walk as runStepForm, over the doc fields instead of the knowledge ones. */
async function runDocStepForm(initialValues) {
    const values = { ...initialValues };
    let step = 0;
    while (step < DOC_FORM_FIELDS.length) {
        const field = DOC_FORM_FIELDS[step];
        if (!field)
            break;
        const result = await textPrompt(`${field.label}:`, values[field.key]);
        if (result === BACK) {
            if (step === 0)
                return BACK;
            step -= 1;
            continue;
        }
        values[field.key] = result;
        step += 1;
    }
    return values;
}
function describeDoc(doc) {
    return [
        `Título: ${doc.title}`,
        `Tag: ${doc.tag}`,
        `Referencia: ${doc.docReference}`,
        `Ruta: ${doc.path}`,
        "",
        `Resumen: ${doc.summary}`,
        "",
        "(El contenido se guarda en chunks y no se muestra aquí; usa \"Buscar contenido de documentos\" para verlo.)",
    ];
}
async function runDocCreateFlow(createCommand) {
    const values = await runDocStepForm({ title: "", tag: "", docReference: "", path: "", summary: "", content: "" });
    if (values === BACK)
        return;
    const doc = await createCommand.execute(values);
    await viewScreen(["Creado correctamente.", "", ...describeDoc(doc)]);
}
/** Query -> results list -> selection. Esc on the list re-prompts the query; Esc on the query returns BACK. */
async function findDoc(searchQuery, getByKeyQuery) {
    let query = "";
    while (true) {
        const queryResult = await textPrompt("Buscar:", query);
        if (queryResult === BACK)
            return BACK;
        query = queryResult;
        const results = await searchQuery.execute(query, 10);
        if (results.length === 0) {
            await viewScreen(["No se encontraron resultados."]);
            continue;
        }
        const choice = await selectPrompt("Resultados:", results.map((summary) => ({ label: `${summary.title} [${summary.tag}]`, value: summary })));
        if (choice === BACK)
            continue;
        const doc = await getByKeyQuery.execute(choice.key);
        if (!doc) {
            await viewScreen(["No se pudo cargar el elemento seleccionado."]);
            continue;
        }
        return doc;
    }
}
async function runDocUpdateForm(doc, updateCommand) {
    const values = await runDocStepForm({
        title: doc.title,
        tag: doc.tag,
        docReference: doc.docReference,
        path: doc.path,
        summary: doc.summary,
        content: "",
    });
    if (values === BACK)
        return;
    // Leaving content blank keeps the existing chunks untouched (only re-chunked/re-embedded when
    // new content is actually entered).
    const { content, ...metadata } = values;
    const updated = await updateCommand.execute(doc.key, content ? { ...metadata, content } : metadata);
    await viewScreen(["Actualizado correctamente.", "", ...describeDoc(updated)]);
}
async function runDocSearchFlow(searchQuery, getByKeyQuery, updateCommand) {
    while (true) {
        const doc = await findDoc(searchQuery, getByKeyQuery);
        if (doc === BACK)
            return;
        const action = await selectPrompt(describeDoc(doc).join("\n"), [
            { label: "Actualizar este elemento", value: "update" },
        ]);
        if (action === "update") {
            await runDocUpdateForm(doc, updateCommand);
        }
    }
}
async function runDocUpdateFlow(searchQuery, getByKeyQuery, updateCommand) {
    const doc = await findDoc(searchQuery, getByKeyQuery);
    if (doc === BACK)
        return;
    await runDocUpdateForm(doc, updateCommand);
}
/** Searches doc content chunks directly — docs store no content themselves, so this is the only
 * flow that actually shows matched text. */
async function runDocContentSearchFlow(searchChunksQuery) {
    let query = "";
    while (true) {
        const queryResult = await textPrompt("Buscar en contenido:", query);
        if (queryResult === BACK)
            return;
        query = queryResult;
        const matches = await searchChunksQuery.execute(query, 10);
        if (matches.length === 0) {
            await viewScreen(["No se encontraron resultados."]);
            continue;
        }
        const choice = await selectPrompt("Resultados:", matches.map((match) => ({
            label: `${match.docTitle} [${match.docTag}] (chunk ${match.chunkIndex})`,
            value: match,
        })));
        if (choice === BACK)
            continue;
        await viewScreen([
            `Título: ${choice.docTitle}`,
            `Referencia: ${choice.docReference}`,
            `Ruta: ${choice.docPath}`,
            "",
            `Chunk ${choice.chunkIndex}:`,
            choice.content,
        ]);
    }
}
async function runMainMenu() {
    const choice = await selectPrompt("ragnarok - ¿Qué quieres hacer?", [
        { label: "Insertar conocimiento", value: "create" },
        { label: "Actualizar conocimiento", value: "update" },
        { label: "Buscar conocimiento", value: "search" },
        { label: "Insertar documento", value: "doc-create" },
        { label: "Actualizar documento", value: "doc-update" },
        { label: "Buscar documentos", value: "doc-search" },
        { label: "Buscar contenido de documentos", value: "doc-content-search" },
        { label: "Salir", value: "exit" },
    ]);
    return choice === BACK ? "exit" : choice;
}
/**
 * Registers the 'ui' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'ui' command will be added.
 * @param repository - The knowledge repository instance.
 * @param docRepository - The doc repository instance.
 * @param docChunkRepository - The doc chunk repository instance, for content-level search.
 */
export function registerUiCommand(program, repository, docRepository, docChunkRepository) {
    program
        .command("ui")
        .description("Start the interactive console UI")
        .argument("[name]", "Namespace", "")
        .action(async (name) => {
        await runMigrations();
        const createCommand = new CreateKnowledgeCommand(repository);
        const updateCommand = new UpdateKnowledgeCommand(repository);
        const searchQuery = new SearchKnowledgeQuery(repository);
        const getByKeyQuery = new GetKnowledgeByKeyQuery(repository);
        const docCreateCommand = new CreateDocCommand(docRepository);
        const docUpdateCommand = new UpdateDocCommand(docRepository);
        const docSearchQuery = new SearchDocsQuery(docRepository);
        const docGetByKeyQuery = new GetDocByKeyQuery(docRepository);
        const docContentSearchQuery = new SearchDocChunksQuery(docChunkRepository);
        while (true) {
            const choice = await runMainMenu();
            if (choice === "exit")
                break;
            if (choice === "create")
                await runCreateFlow(name, createCommand);
            if (choice === "update")
                await runUpdateFlow(name, searchQuery, getByKeyQuery, updateCommand);
            if (choice === "search")
                await runSearchFlow(name, searchQuery, getByKeyQuery, updateCommand);
            if (choice === "doc-create")
                await runDocCreateFlow(docCreateCommand);
            if (choice === "doc-update")
                await runDocUpdateFlow(docSearchQuery, docGetByKeyQuery, docUpdateCommand);
            if (choice === "doc-search")
                await runDocSearchFlow(docSearchQuery, docGetByKeyQuery, docUpdateCommand);
            if (choice === "doc-content-search")
                await runDocContentSearchFlow(docContentSearchQuery);
        }
        console.clear();
    });
}
//# sourceMappingURL=ui.command.js.map