import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
export function registerMcpCommand(program, repository) {
    program
        .command('mcp')
        .description('Start the MCP stdio server')
        .action(async () => {
        const server = new McpServer({
            name: 'rag',
            version: '1.0.0',
        });
        server.registerTool('search_knowledge', {
            description: 'Search the knowledge base',
            inputSchema: {
                search: z.string().describe('Search query'),
                limit: z.number().int().min(1).default(5).describe('Maximum number of results'),
                tag: z.string().optional().describe('Filter by tag'),
                project: z.string().optional().describe('Filter by project'),
            },
        }, async ({ search, limit, tag, project }) => {
            const results = await repository.search(search, limit, tag, project);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        });
        const transport = new StdioServerTransport();
        await server.connect(transport);
    });
}
//# sourceMappingURL=mcp.js.map