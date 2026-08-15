import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runMigrations } from '../infrastructure/migrations/run-migrations.js';
/**
 * Registers the 'mcp' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'mcp' command will be added.
 * @param repository - The knowledge repository instance.
 * @param docRepository - The doc repository instance.
 * @param docChunkRepository - The doc chunk repository instance, for content-level search.
 */
export function registerMcpCommand(program, repository, docRepository, docChunkRepository) {
    program
        .command('mcp')
        .description('Start the MCP stdio server')
        .action(async () => {
        await runMigrations();
        const server = new McpServer({
            name: 'ragnarok',
            version: '1.0.0',
        });
        server.registerTool('about', {
            description: 'Explains what this MCP server is and how to use its tools together. Call this first if you are unsure what this server does.',
            inputSchema: {},
        }, async () => {
            const about = [
                '"ragnarok" is a personal knowledge base. Each entry has: title, tag (a free-form label),',
                'namespace (a logical grouping for entries — a project, a team, or anything else you use',
                'to organize them), summary, content, reference, and storeContent.',
                '',
                'Field guidance:',
                '- title: a short, descriptive headline for the entry — one line, roughly 5-12 words',
                '  (~80 characters max). It is what shows up in search results, so make it distinctive',
                '  and specific rather than generic.',
                '- summary: a compact abstract of the entry, about 2-3 lines of prose (~200-400 characters).',
                '  Enough to judge relevance without opening the full entry, but not a restatement of the content.',
                '- content: the full body — no size limit. Everything that does not fit in title/summary goes here.',
                '  Long content is automatically split into overlapping chunks for embedding, so search still works well.',
                '- reference: a pointer to the original source (a URL or file path), for entries that mirror',
                '  external content instead of being freeform notes.',
                '- storeContent: defaults to true. Set to false when content is only there to generate the search',
                '  embedding and should not be persisted (e.g. text extracted from a PDF whose reference is the',
                '  source of truth) — only title/summary/reference are kept in that case.',
                '',
                'Tools available on this server:',
                '- list_namespaces / list_tags: discover the namespace/tag values currently in use, with no repetition.',
                '- search_knowledge: hybrid semantic + keyword search over title/tag/summary/content, optionally',
                '  filtered by tag and/or namespace.',
                '- get_knowledge_by_key: fetch the full entry (including content) for a key returned by search_knowledge.',
                '- create_knowledge: create a new entry (title, content required; tag/namespace/summary optional).',
                '- update_knowledge: partially update an entry by key; only the fields you pass are changed.',
                '',
                'Before saving anything, always search_knowledge first to check whether the topic is already',
                'covered. If a matching entry exists, prefer update_knowledge over creating a duplicate;',
                'only call create_knowledge once you have confirmed no existing entry already covers it.',
                '',
                'Typical flow: list_namespaces/list_tags to see what exists -> search_knowledge to find candidates',
                '-> get_knowledge_by_key to read the full entry -> create_knowledge to add new entries, or',
                'update_knowledge to edit existing ones.',
                '',
                'Separately, "docs" is a document manager for content whose source of truth lives elsewhere',
                '(e.g. a PDF): each doc has title, tag, summary, docReference (pointer to the source, e.g. a',
                'URL), and path (e.g. a file path) — but no content column of its own. Content passed to',
                'create_doc/update_doc is split into chunks and embedded in a separate table, not stored',
                'verbatim on the doc. Use search_docs to find docs by title/summary/tag, and',
                'search_doc_content to semantically search the actual chunked content (the only tool that',
                'returns matched text, since docs carry no content field themselves).',
            ].join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: about,
                    },
                ],
            };
        });
        server.registerTool('search_knowledge', {
            description: 'Search the knowledge base',
            inputSchema: {
                search: z.string().describe('Search query'),
                limit: z.number().int().min(1).default(5).describe('Maximum number of results'),
                tag: z.string().optional().describe('Filter by tag'),
                namespace: z.string().optional().describe('Filter by namespace, a logical grouping for knowledge entries (e.g. a project, team, or any other category you use to organize them). Call list_namespaces to see the available values.'),
            },
        }, async ({ search, limit, tag, namespace }) => {
            const results = await repository.search(search, limit, tag, namespace);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        });
        server.registerTool('list_namespaces', {
            description: 'List every distinct namespace currently used to group knowledge entries, with no repetition. Use this to discover valid values for the namespace filter on search_knowledge.',
            inputSchema: {},
        }, async () => {
            const namespaces = await repository.listNamespaces();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(namespaces, null, 2),
                    },
                ],
            };
        });
        server.registerTool('list_tags', {
            description: 'List every distinct tag currently used across knowledge entries, with no repetition. Use this to discover valid values for the tag filter on search_knowledge.',
            inputSchema: {},
        }, async () => {
            const tags = await repository.listTags();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(tags, null, 2),
                    },
                ],
            };
        });
        server.registerTool('get_knowledge_by_key', {
            description: 'Fetch the full knowledge entry (including content) for a given key. Use this after search_knowledge to load the full record behind a result.',
            inputSchema: {
                key: z.string().describe('Key of the knowledge entry, as returned by search_knowledge'),
            },
        }, async ({ key }) => {
            const knowledge = await repository.getByKey(key);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(knowledge, null, 2),
                    },
                ],
            };
        });
        server.registerTool('create_knowledge', {
            description: 'Create a new knowledge entry. Search_knowledge first to make sure the topic is not already ' +
                'covered — prefer update_knowledge over creating a duplicate. Title should be a short summary ' +
                'headline (~80 characters max); summary should be about 2-3 lines; everything else goes in content.',
            inputSchema: {
                title: z.string().describe('Short summary headline, ~80 characters max'),
                content: z.string().describe('Full content of the entry'),
                summary: z.string().optional().default('').describe('Compact abstract, about 2-3 lines'),
                tag: z.string().optional().default('').describe('Free-form label'),
                namespace: z.string().optional().default('').describe('Logical grouping for the entry (e.g. a project, team, or any other category you use to organize them)'),
                reference: z.string().optional().default('').describe('Pointer to the original source (e.g. a URL or file path), when this entry mirrors external content'),
                storeContent: z.boolean().optional().default(true).describe('Whether to persist content as-is. Set false when content is only used to generate the embedding ' +
                    '(e.g. text extracted from a PDF) and the source of truth lives elsewhere — only title/summary/reference are kept.'),
            },
        }, async ({ title, content, summary, tag, namespace, reference, storeContent }) => {
            const knowledge = await repository.create({
                title,
                content,
                summary,
                tag,
                namespace,
                reference,
                storeContent,
                version: 1,
                active: true,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(knowledge, null, 2),
                    },
                ],
            };
        });
        server.registerTool('update_knowledge', {
            description: 'Update a knowledge entry by key. Only the fields provided are changed; omitted fields keep their current value. Title, summary, and content changes automatically refresh the embedding used for search.',
            inputSchema: {
                key: z.string().describe('Key of the knowledge entry to update'),
                title: z.string().optional().describe('New title'),
                tag: z.string().optional().describe('New tag'),
                namespace: z.string().optional().describe('New namespace'),
                summary: z.string().optional().describe('New summary'),
                content: z.string().optional().describe('New content'),
                reference: z.string().optional().describe('New reference (pointer to the original source)'),
                storeContent: z.boolean().optional().describe('New storeContent flag. Setting this to false clears any previously persisted content.'),
                version: z.number().int().optional().describe('New version number'),
                active: z.boolean().optional().describe('Whether the entry is active'),
            },
        }, async ({ key, ...changes }) => {
            const definedChanges = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
            const knowledge = await repository.updateByKey(key, definedChanges);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(knowledge, null, 2),
                    },
                ],
            };
        });
        server.registerTool('search_docs', {
            description: 'Search docs by title/summary/tag/content relevance. Returns doc metadata only — use ' +
                'search_doc_content to see matched text, since docs store no content field of their own.',
            inputSchema: {
                search: z.string().describe('Search query'),
                limit: z.number().int().min(1).default(5).describe('Maximum number of results'),
                tag: z.string().optional().describe('Filter by tag'),
            },
        }, async ({ search, limit, tag }) => {
            const results = await docRepository.search(search, limit, tag);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        });
        server.registerTool('search_doc_content', {
            description: 'Semantic + keyword search directly over doc content chunks. Returns the matched chunk text ' +
                'plus enough of the parent doc (title/reference/path/tag) to be useful without another lookup.',
            inputSchema: {
                search: z.string().describe('Search query'),
                limit: z.number().int().min(1).default(5).describe('Maximum number of chunk results'),
                tag: z.string().optional().describe("Filter by the parent doc's tag"),
            },
        }, async ({ search, limit, tag }) => {
            const results = await docChunkRepository.search(search, limit, tag);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        });
        server.registerTool('list_doc_tags', {
            description: 'List every distinct tag currently used across docs, with no repetition. Use this to discover valid values for the tag filter on search_docs/search_doc_content.',
            inputSchema: {},
        }, async () => {
            const tags = await docRepository.listTags();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(tags, null, 2),
                    },
                ],
            };
        });
        server.registerTool('get_doc_by_key', {
            description: 'Fetch doc metadata for a given key. Use search_doc_content to see the doc\'s actual content.',
            inputSchema: {
                key: z.string().describe('Key of the doc, as returned by search_docs'),
            },
        }, async ({ key }) => {
            const doc = await docRepository.getByKey(key);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(doc, null, 2),
                    },
                ],
            };
        });
        server.registerTool('create_doc', {
            description: 'Create a new doc. Content is split into chunks and embedded, not stored verbatim — the doc ' +
                'row itself only keeps title/tag/summary/docReference/path. Search_docs first to avoid duplicates.',
            inputSchema: {
                title: z.string().describe('Short summary headline, ~80 characters max'),
                content: z.string().describe('Full content, to be chunked and embedded'),
                summary: z.string().optional().default('').describe('Compact abstract, about 2-3 lines'),
                tag: z.string().optional().default('').describe('Free-form label'),
                docReference: z.string().optional().default('').describe('Pointer to the original source (e.g. a URL)'),
                path: z.string().optional().default('').describe('Path to the source (e.g. a file path)'),
            },
        }, async ({ title, content, summary, tag, docReference, path }) => {
            const doc = await docRepository.create({ title, content, summary, tag, docReference, path });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(doc, null, 2),
                    },
                ],
            };
        });
        server.registerTool('update_doc', {
            description: 'Update a doc by key. Only the fields provided are changed. Passing content re-chunks and ' +
                're-embeds it, replacing all of the doc\'s existing chunks.',
            inputSchema: {
                key: z.string().describe('Key of the doc to update'),
                title: z.string().optional().describe('New title'),
                tag: z.string().optional().describe('New tag'),
                summary: z.string().optional().describe('New summary'),
                docReference: z.string().optional().describe('New reference (pointer to the original source)'),
                path: z.string().optional().describe('New path'),
                content: z.string().optional().describe('New content; replaces all existing chunks'),
            },
        }, async ({ key, ...changes }) => {
            const definedChanges = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
            const doc = await docRepository.updateByKey(key, definedChanges);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(doc, null, 2),
                    },
                ],
            };
        });
        const transport = new StdioServerTransport();
        await server.connect(transport);
    });
}
//# sourceMappingURL=mcp.command.js.map