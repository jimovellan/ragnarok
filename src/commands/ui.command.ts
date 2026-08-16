import type { Command } from "commander";
import type { Knowledge } from "../domain/entities/knowledge.entity.js";
import type { Doc } from "../domain/entities/doc.entity.js";
import type { KnowledgeRepository } from "../domain/repositories/knowledge.repository.js";
import type { DocRepository } from "../domain/repositories/doc.repository.js";
import type { DocChunkRepository } from "../domain/repositories/doc-chunk.repository.js";
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
import { notifyIfUpdateAvailable } from "../infrastructure/update/check-update.js";

interface FormField {
  key: "title" | "tag" | "summary" | "content" | "reference";
  label: string;
}

const FORM_FIELDS: FormField[] = [
  { key: "title", label: "Título" },
  { key: "tag", label: "Tag" },
  { key: "summary", label: "Resumen" },
  { key: "content", label: "Contenido" },
  { key: "reference", label: "Referencia (URL o ruta, opcional)" },
];

type FormValues = Record<FormField["key"], string>;

/** Walks the fields one at a time; Esc on a field steps back to the previous one, Esc on the first exits to the caller. */
async function runStepForm(initialValues: FormValues): Promise<FormValues | typeof BACK> {
  const values: FormValues = { ...initialValues };
  let step = 0;

  while (step < FORM_FIELDS.length) {
    const field = FORM_FIELDS[step];
    if (!field) break;

    const result = await textPrompt(`${field.label}:`, values[field.key]);
    if (result === BACK) {
      if (step === 0) return BACK;
      step -= 1;
      continue;
    }

    values[field.key] = result;
    step += 1;
  }

  return values;
}

/** Esc keeps the current value (used as the default when re-editing an existing entry). */
async function runStoreContentPrompt(current: boolean): Promise<boolean> {
  const choice = await selectPrompt<boolean>("¿Guardar el contenido tal cual (además de usarlo para el embedding)?", [
    { label: "Sí", value: true },
    { label: "No (solo título/resumen/referencia)", value: false },
  ]);
  return choice === BACK ? current : choice;
}

function describeKnowledge(knowledge: Knowledge): string[] {
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

async function runCreateFlow(namespace: string, createCommand: CreateKnowledgeCommand): Promise<void> {
  const values = await runStepForm({ title: "", tag: "", summary: "", content: "", reference: "" });
  if (values === BACK) return;

  const storeContent = await runStoreContentPrompt(true);
  const knowledge = await createCommand.execute({ ...values, namespace, storeContent, version: 1, active: true });
  await viewScreen(["Creado correctamente.", "", ...describeKnowledge(knowledge)]);
}

/** Query -> results list -> selection. Esc on the list re-prompts the query; Esc on the query returns BACK. */
async function findKnowledge(
  namespace: string,
  searchQuery: SearchKnowledgeQuery,
  getByKeyQuery: GetKnowledgeByKeyQuery,
): Promise<Knowledge | typeof BACK> {
  let query = "";

  while (true) {
    const queryResult = await textPrompt("Buscar:", query);
    if (queryResult === BACK) return BACK;
    query = queryResult;

    const results = await searchQuery.execute(query, 10, undefined, namespace);
    if (results.length === 0) {
      await viewScreen(["No se encontraron resultados."]);
      continue;
    }

    const choice = await selectPrompt(
      "Resultados:",
      results.map((summary) => ({ label: `${summary.title} [${summary.tag}]`, value: summary })),
    );
    if (choice === BACK) continue;

    const knowledge = await getByKeyQuery.execute(choice.key);
    if (!knowledge) {
      await viewScreen(["No se pudo cargar el elemento seleccionado."]);
      continue;
    }

    return knowledge;
  }
}

async function runUpdateForm(knowledge: Knowledge, updateCommand: UpdateKnowledgeCommand): Promise<void> {
  const values = await runStepForm({
    title: knowledge.title,
    tag: knowledge.tag,
    summary: knowledge.summary,
    content: knowledge.content,
    reference: knowledge.reference,
  });
  if (values === BACK) return;

  const storeContent = await runStoreContentPrompt(knowledge.storeContent);
  const updated = await updateCommand.execute(knowledge.key, { ...values, storeContent });
  await viewScreen(["Actualizado correctamente.", "", ...describeKnowledge(updated)]);
}

async function runSearchFlow(
  namespace: string,
  searchQuery: SearchKnowledgeQuery,
  getByKeyQuery: GetKnowledgeByKeyQuery,
  updateCommand: UpdateKnowledgeCommand,
): Promise<void> {
  while (true) {
    const knowledge = await findKnowledge(namespace, searchQuery, getByKeyQuery);
    if (knowledge === BACK) return;

    const action = await selectPrompt<"update">(describeKnowledge(knowledge).join("\n"), [
      { label: "Actualizar este elemento", value: "update" },
    ]);

    if (action === "update") {
      await runUpdateForm(knowledge, updateCommand);
    }
  }
}

async function runUpdateFlow(
  namespace: string,
  searchQuery: SearchKnowledgeQuery,
  getByKeyQuery: GetKnowledgeByKeyQuery,
  updateCommand: UpdateKnowledgeCommand,
): Promise<void> {
  const knowledge = await findKnowledge(namespace, searchQuery, getByKeyQuery);
  if (knowledge === BACK) return;

  await runUpdateForm(knowledge, updateCommand);
}

interface DocFormField {
  key: "title" | "tag" | "docReference" | "path" | "summary" | "content";
  label: string;
}

const DOC_FORM_FIELDS: DocFormField[] = [
  { key: "title", label: "Título" },
  { key: "tag", label: "Tag" },
  { key: "docReference", label: "Referencia (doc_reference)" },
  { key: "path", label: "Ruta" },
  { key: "summary", label: "Resumen" },
  { key: "content", label: "Contenido" },
];

type DocFormValues = Record<DocFormField["key"], string>;

/** Same step-by-step walk as runStepForm, over the doc fields instead of the knowledge ones. */
async function runDocStepForm(initialValues: DocFormValues): Promise<DocFormValues | typeof BACK> {
  const values: DocFormValues = { ...initialValues };
  let step = 0;

  while (step < DOC_FORM_FIELDS.length) {
    const field = DOC_FORM_FIELDS[step];
    if (!field) break;

    const result = await textPrompt(`${field.label}:`, values[field.key]);
    if (result === BACK) {
      if (step === 0) return BACK;
      step -= 1;
      continue;
    }

    values[field.key] = result;
    step += 1;
  }

  return values;
}

function describeDoc(doc: Doc): string[] {
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

async function runDocCreateFlow(createCommand: CreateDocCommand): Promise<void> {
  const values = await runDocStepForm({ title: "", tag: "", docReference: "", path: "", summary: "", content: "" });
  if (values === BACK) return;

  const doc = await createCommand.execute(values);
  await viewScreen(["Creado correctamente.", "", ...describeDoc(doc)]);
}

/** Query -> results list -> selection. Esc on the list re-prompts the query; Esc on the query returns BACK. */
async function findDoc(searchQuery: SearchDocsQuery, getByKeyQuery: GetDocByKeyQuery): Promise<Doc | typeof BACK> {
  let query = "";

  while (true) {
    const queryResult = await textPrompt("Buscar:", query);
    if (queryResult === BACK) return BACK;
    query = queryResult;

    const results = await searchQuery.execute(query, 10);
    if (results.length === 0) {
      await viewScreen(["No se encontraron resultados."]);
      continue;
    }

    const choice = await selectPrompt(
      "Resultados:",
      results.map((summary) => ({ label: `${summary.title} [${summary.tag}]`, value: summary })),
    );
    if (choice === BACK) continue;

    const doc = await getByKeyQuery.execute(choice.key);
    if (!doc) {
      await viewScreen(["No se pudo cargar el elemento seleccionado."]);
      continue;
    }

    return doc;
  }
}

async function runDocUpdateForm(doc: Doc, updateCommand: UpdateDocCommand): Promise<void> {
  const values = await runDocStepForm({
    title: doc.title,
    tag: doc.tag,
    docReference: doc.docReference,
    path: doc.path,
    summary: doc.summary,
    content: "",
  });
  if (values === BACK) return;

  // Leaving content blank keeps the existing chunks untouched (only re-chunked/re-embedded when
  // new content is actually entered).
  const { content, ...metadata } = values;
  const updated = await updateCommand.execute(doc.key, content ? { ...metadata, content } : metadata);
  await viewScreen(["Actualizado correctamente.", "", ...describeDoc(updated)]);
}

async function runDocSearchFlow(
  searchQuery: SearchDocsQuery,
  getByKeyQuery: GetDocByKeyQuery,
  updateCommand: UpdateDocCommand,
): Promise<void> {
  while (true) {
    const doc = await findDoc(searchQuery, getByKeyQuery);
    if (doc === BACK) return;

    const action = await selectPrompt<"update">(describeDoc(doc).join("\n"), [
      { label: "Actualizar este elemento", value: "update" },
    ]);

    if (action === "update") {
      await runDocUpdateForm(doc, updateCommand);
    }
  }
}

async function runDocUpdateFlow(
  searchQuery: SearchDocsQuery,
  getByKeyQuery: GetDocByKeyQuery,
  updateCommand: UpdateDocCommand,
): Promise<void> {
  const doc = await findDoc(searchQuery, getByKeyQuery);
  if (doc === BACK) return;

  await runDocUpdateForm(doc, updateCommand);
}

/** Searches doc content chunks directly — docs store no content themselves, so this is the only
 * flow that actually shows matched text. */
async function runDocContentSearchFlow(searchChunksQuery: SearchDocChunksQuery): Promise<void> {
  let query = "";

  while (true) {
    const queryResult = await textPrompt("Buscar en contenido:", query);
    if (queryResult === BACK) return;
    query = queryResult;

    const matches = await searchChunksQuery.execute(query, 10);
    if (matches.length === 0) {
      await viewScreen(["No se encontraron resultados."]);
      continue;
    }

    const choice = await selectPrompt(
      "Resultados:",
      matches.map((match) => ({
        label: `${match.docTitle} [${match.docTag}] (chunk ${match.chunkIndex})`,
        value: match,
      })),
    );
    if (choice === BACK) continue;

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

type MainMenuChoice =
  | "create"
  | "update"
  | "search"
  | "doc-create"
  | "doc-update"
  | "doc-search"
  | "doc-content-search"
  | "exit";

async function runMainMenu(): Promise<MainMenuChoice> {
  const choice = await selectPrompt<MainMenuChoice>("ragnarok - ¿Qué quieres hacer?", [
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
export function registerUiCommand(
  program: Command,
  repository: KnowledgeRepository,
  docRepository: DocRepository,
  docChunkRepository: DocChunkRepository,
): void {
  program
    .command("ui")
    .description("Start the interactive console UI")
    .argument("[name]", "Namespace", "")
    .action(async (name: string) => {
      notifyIfUpdateAvailable();

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

        if (choice === "exit") break;
        if (choice === "create") await runCreateFlow(name, createCommand);
        if (choice === "update") await runUpdateFlow(name, searchQuery, getByKeyQuery, updateCommand);
        if (choice === "search") await runSearchFlow(name, searchQuery, getByKeyQuery, updateCommand);
        if (choice === "doc-create") await runDocCreateFlow(docCreateCommand);
        if (choice === "doc-update") await runDocUpdateFlow(docSearchQuery, docGetByKeyQuery, docUpdateCommand);
        if (choice === "doc-search") await runDocSearchFlow(docSearchQuery, docGetByKeyQuery, docUpdateCommand);
        if (choice === "doc-content-search") await runDocContentSearchFlow(docContentSearchQuery);
      }

      console.clear();
    });
}
