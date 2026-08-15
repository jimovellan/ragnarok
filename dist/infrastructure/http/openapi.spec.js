import { getVersion } from "../../common/common.utils.js";
const knowledgeSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        key: { type: "string" },
        title: { type: "string" },
        tag: { type: "string" },
        namespace: { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        reference: { type: "string" },
        storeContent: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        version: { type: "integer" },
        active: { type: "boolean" },
    },
};
const knowledgeSummarySchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        key: { type: "string" },
        title: { type: "string" },
        tag: { type: "string" },
        namespace: { type: "string" },
        summary: { type: "string" },
        reference: { type: "string" },
    },
};
const docSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        key: { type: "string" },
        docReference: { type: "string" },
        path: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        tag: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
    },
};
// Docs have no content column of their own — see docChunkMatchSchema for where matched text
// actually surfaces.
const docChunkMatchSchema = {
    type: "object",
    properties: {
        docKey: { type: "string" },
        chunkIndex: { type: "integer" },
        content: { type: "string" },
        docTitle: { type: "string" },
        docReference: { type: "string" },
        docPath: { type: "string" },
        docTag: { type: "string" },
    },
};
const errorSchema = {
    type: "object",
    properties: {
        error: { type: "string" },
    },
};
export async function buildOpenApiSpec() {
    return {
        openapi: "3.1.0",
        info: {
            title: "ragnarok",
            description: "REST API for the ragnarok personal knowledge base.",
            version: await getVersion(),
        },
        paths: {
            "/api/namespaces": {
                get: {
                    summary: "List namespaces",
                    description: "List every distinct namespace currently used to group knowledge entries.",
                    operationId: "listNamespaces",
                    responses: {
                        "200": {
                            description: "Namespaces",
                            content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
                        },
                    },
                },
            },
            "/api/tags": {
                get: {
                    summary: "List tags",
                    description: "List every distinct tag currently used across knowledge entries.",
                    operationId: "listTags",
                    responses: {
                        "200": {
                            description: "Tags",
                            content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
                        },
                    },
                },
            },
            "/api/knowledge": {
                get: {
                    summary: "Search knowledge",
                    description: "Hybrid semantic + keyword search over title/tag/summary/content.",
                    operationId: "searchKnowledge",
                    parameters: [
                        { name: "search", in: "query", required: true, schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 5, minimum: 1 } },
                        { name: "tag", in: "query", schema: { type: "string" } },
                        { name: "namespace", in: "query", schema: { type: "string" } },
                    ],
                    responses: {
                        "200": {
                            description: "Matching entries",
                            content: { "application/json": { schema: { type: "array", items: knowledgeSummarySchema } } },
                        },
                    },
                },
                post: {
                    summary: "Create knowledge",
                    description: "Create a new knowledge entry. Search first to check the topic is not already covered — " +
                        "prefer PATCH over creating a duplicate.",
                    operationId: "createKnowledge",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["title", "content"],
                                    properties: {
                                        title: { type: "string", description: "Short summary headline, ~80 characters max" },
                                        content: { type: "string", description: "Full content of the entry" },
                                        summary: { type: "string", description: "Compact abstract, about 2-3 lines" },
                                        tag: { type: "string", description: "Free-form label" },
                                        namespace: { type: "string", description: "Logical grouping for the entry" },
                                        reference: { type: "string", description: "Pointer to the original source (e.g. a URL or path)" },
                                        storeContent: {
                                            type: "boolean",
                                            default: true,
                                            description: "Whether to persist content as-is. Set false when content is only used to generate the " +
                                                "embedding (e.g. text extracted from a PDF) and the source of truth lives elsewhere.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "201": { description: "Created entry", content: { "application/json": { schema: knowledgeSchema } } },
                        "400": { description: "Invalid payload", content: { "application/json": { schema: errorSchema } } },
                    },
                },
            },
            "/api/knowledge/{key}": {
                get: {
                    summary: "Get knowledge by key",
                    operationId: "getKnowledgeByKey",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        "200": { description: "Entry", content: { "application/json": { schema: knowledgeSchema } } },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
                patch: {
                    summary: "Update knowledge by key",
                    description: "Only the fields provided are changed; omitted fields keep their current value.",
                    operationId: "updateKnowledge",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        content: { type: "string" },
                                        summary: { type: "string" },
                                        tag: { type: "string" },
                                        namespace: { type: "string" },
                                        reference: { type: "string" },
                                        storeContent: { type: "boolean" },
                                        version: { type: "integer" },
                                        active: { type: "boolean" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "Updated entry", content: { "application/json": { schema: knowledgeSchema } } },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
                delete: {
                    summary: "Delete knowledge by key",
                    operationId: "deleteKnowledge",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        "204": { description: "Deleted" },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
            },
            "/api/doc-tags": {
                get: {
                    summary: "List doc tags",
                    description: "List every distinct tag currently used across docs.",
                    operationId: "listDocTags",
                    responses: {
                        "200": {
                            description: "Tags",
                            content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
                        },
                    },
                },
            },
            "/api/docs": {
                get: {
                    summary: "Search docs",
                    description: "Hybrid semantic + keyword search over each doc's title/tag/summary/content. Returns doc metadata " +
                        "only — docs have no content field of their own; use GET /api/docs/content for matched text.",
                    operationId: "searchDocs",
                    parameters: [
                        { name: "search", in: "query", required: true, schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 5, minimum: 1 } },
                        { name: "tag", in: "query", schema: { type: "string" } },
                    ],
                    responses: {
                        "200": {
                            description: "Matching docs",
                            content: { "application/json": { schema: { type: "array", items: docSchema } } },
                        },
                    },
                },
                post: {
                    summary: "Create doc",
                    description: "Create a new doc. Content is split into chunks and embedded, not stored verbatim — the doc row " +
                        "itself only keeps title/tag/summary/docReference/path.",
                    operationId: "createDoc",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["title", "content"],
                                    properties: {
                                        title: { type: "string", description: "Short summary headline, ~80 characters max" },
                                        content: { type: "string", description: "Full content, to be chunked and embedded" },
                                        summary: { type: "string", description: "Compact abstract, about 2-3 lines" },
                                        tag: { type: "string", description: "Free-form label" },
                                        docReference: { type: "string", description: "Pointer to the original source (e.g. a URL)" },
                                        path: { type: "string", description: "Path to the source (e.g. a file path)" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "201": { description: "Created doc", content: { "application/json": { schema: docSchema } } },
                        "400": { description: "Invalid payload", content: { "application/json": { schema: errorSchema } } },
                    },
                },
            },
            "/api/docs/content": {
                get: {
                    summary: "Search doc content",
                    description: "Semantic + keyword search directly over doc content chunks. Returns the matched chunk text plus " +
                        "enough of the parent doc to be useful without another lookup.",
                    operationId: "searchDocContent",
                    parameters: [
                        { name: "search", in: "query", required: true, schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 5, minimum: 1 } },
                        { name: "tag", in: "query", description: "Filter by the parent doc's tag", schema: { type: "string" } },
                    ],
                    responses: {
                        "200": {
                            description: "Matching chunks",
                            content: { "application/json": { schema: { type: "array", items: docChunkMatchSchema } } },
                        },
                    },
                },
            },
            "/api/docs/{key}": {
                get: {
                    summary: "Get doc by key",
                    operationId: "getDocByKey",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        "200": { description: "Doc", content: { "application/json": { schema: docSchema } } },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
                patch: {
                    summary: "Update doc by key",
                    description: "Only the fields provided are changed. Passing content re-chunks and re-embeds it, replacing all of " +
                        "the doc's existing chunks.",
                    operationId: "updateDoc",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        content: { type: "string" },
                                        summary: { type: "string" },
                                        tag: { type: "string" },
                                        docReference: { type: "string" },
                                        path: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "Updated doc", content: { "application/json": { schema: docSchema } } },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
                delete: {
                    summary: "Delete doc by key",
                    operationId: "deleteDoc",
                    parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        "204": { description: "Deleted" },
                        "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
                    },
                },
            },
        },
    };
}
//# sourceMappingURL=openapi.spec.js.map