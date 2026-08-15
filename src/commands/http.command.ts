import express, { type NextFunction, type Request, type Response } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import type { Command } from 'commander';
import type { KnowledgeChanges, KnowledgeRepository } from '../domain/repositories/knowledge.repository.js';
import type { DocChanges, DocRepository } from '../domain/repositories/doc.repository.js';
import type { DocChunkRepository } from '../domain/repositories/doc-chunk.repository.js';
import { runMigrations } from '../infrastructure/migrations/run-migrations.js';
import { buildOpenApiSpec } from '../infrastructure/http/openapi.spec.js';

const DEFAULT_PORT = 5555;

/**
 * Registers the 'http' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'http' command will be added.
 * @param repository - The knowledge repository instance.
 * @param docRepository - The doc repository instance.
 * @param docChunkRepository - The doc chunk repository instance, for content-level search.
 */
export function registerHttpCommand(
    program: Command,
    repository: KnowledgeRepository,
    docRepository: DocRepository,
    docChunkRepository: DocChunkRepository,
): void {
    program
        .command('http')
        .description('Start the REST API server (with Scalar API reference at /reference)')
        .option('-p, --port <port>', 'Port to listen on', String(DEFAULT_PORT))
        .action(async (options: { port: string }) => {
            const port = Number(options.port);
            if (!Number.isInteger(port) || port <= 0) {
                console.error(`Invalid port: ${options.port}`);
                process.exit(1);
            }

            await runMigrations();

            const app = express();
            app.use(express.json());

            const openApiSpec = await buildOpenApiSpec();

            app.get('/openapi.json', (_req, res) => {
                res.json(openApiSpec);
            });

            app.use('/reference', apiReference({ url: '/openapi.json' }));

            app.get('/api/namespaces', async (_req, res) => {
                res.json(await repository.listNamespaces());
            });

            app.get('/api/tags', async (_req, res) => {
                res.json(await repository.listTags());
            });

            app.get('/api/knowledge', async (req, res) => {
                const search = req.query['search'];
                if (typeof search !== 'string' || search.length === 0) {
                    res.status(400).json({ error: 'Query parameter "search" is required' });
                    return;
                }
                const limit = req.query['limit'] !== undefined ? Number(req.query['limit']) : undefined;
                const tag = typeof req.query['tag'] === 'string' ? req.query['tag'] : undefined;
                const namespace = typeof req.query['namespace'] === 'string' ? req.query['namespace'] : undefined;
                res.json(await repository.search(search, limit, tag, namespace));
            });

            app.post('/api/knowledge', async (req, res) => {
                const { title, content, summary, tag, namespace, reference, storeContent } = req.body ?? {};
                if (typeof title !== 'string' || typeof content !== 'string') {
                    res.status(400).json({ error: '"title" and "content" are required strings' });
                    return;
                }
                const knowledge = await repository.create({
                    title,
                    content,
                    summary: typeof summary === 'string' ? summary : '',
                    tag: typeof tag === 'string' ? tag : '',
                    namespace: typeof namespace === 'string' ? namespace : '',
                    reference: typeof reference === 'string' ? reference : '',
                    storeContent: typeof storeContent === 'boolean' ? storeContent : true,
                    version: 1,
                    active: true,
                });
                res.status(201).json(knowledge);
            });

            app.get('/api/knowledge/:key', async (req, res) => {
                const knowledge = await repository.getByKey(req.params['key'] as string);
                if (!knowledge) {
                    res.status(404).json({ error: `Knowledge with key ${req.params['key']} not found` });
                    return;
                }
                res.json(knowledge);
            });

            app.patch('/api/knowledge/:key', async (req, res) => {
                const changes = (req.body ?? {}) as KnowledgeChanges;
                const knowledge = await repository.updateByKey(req.params['key'] as string, changes);
                res.json(knowledge);
            });

            app.delete('/api/knowledge/:key', async (req, res) => {
                await repository.removeByKey(req.params['key'] as string);
                res.status(204).send();
            });

            app.get('/api/doc-tags', async (_req, res) => {
                res.json(await docRepository.listTags());
            });

            app.get('/api/docs', async (req, res) => {
                const search = req.query['search'];
                if (typeof search !== 'string' || search.length === 0) {
                    res.status(400).json({ error: 'Query parameter "search" is required' });
                    return;
                }
                const limit = req.query['limit'] !== undefined ? Number(req.query['limit']) : undefined;
                const tag = typeof req.query['tag'] === 'string' ? req.query['tag'] : undefined;
                res.json(await docRepository.search(search, limit, tag));
            });

            // Docs store no content of their own — this is the endpoint that actually returns matched text.
            app.get('/api/docs/content', async (req, res) => {
                const search = req.query['search'];
                if (typeof search !== 'string' || search.length === 0) {
                    res.status(400).json({ error: 'Query parameter "search" is required' });
                    return;
                }
                const limit = req.query['limit'] !== undefined ? Number(req.query['limit']) : undefined;
                const tag = typeof req.query['tag'] === 'string' ? req.query['tag'] : undefined;
                res.json(await docChunkRepository.search(search, limit, tag));
            });

            app.post('/api/docs', async (req, res) => {
                const { title, content, summary, tag, docReference, path } = req.body ?? {};
                if (typeof title !== 'string' || typeof content !== 'string') {
                    res.status(400).json({ error: '"title" and "content" are required strings' });
                    return;
                }
                const doc = await docRepository.create({
                    title,
                    content,
                    summary: typeof summary === 'string' ? summary : '',
                    tag: typeof tag === 'string' ? tag : '',
                    docReference: typeof docReference === 'string' ? docReference : '',
                    path: typeof path === 'string' ? path : '',
                });
                res.status(201).json(doc);
            });

            app.get('/api/docs/:key', async (req, res) => {
                const doc = await docRepository.getByKey(req.params['key'] as string);
                if (!doc) {
                    res.status(404).json({ error: `Doc with key ${req.params['key']} not found` });
                    return;
                }
                res.json(doc);
            });

            app.patch('/api/docs/:key', async (req, res) => {
                const changes = (req.body ?? {}) as DocChanges;
                const doc = await docRepository.updateByKey(req.params['key'] as string, changes);
                res.json(doc);
            });

            app.delete('/api/docs/:key', async (req, res) => {
                await docRepository.removeByKey(req.params['key'] as string);
                res.status(204).send();
            });

            app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
                const status = /not found/i.test(error.message) ? 404 : 500;
                res.status(status).json({ error: error.message });
            });

            app.listen(port, () => {
                console.log(`ragnarok REST API listening on http://localhost:${port}`);
                console.log(`API reference available at http://localhost:${port}/reference`);
            });
        });
}
