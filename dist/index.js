#!/usr/bin/env node
import './env.js';
import { Command } from 'commander';
import { getVersion } from './common/common.utils.js';
import { registerHttpCommand, registerMcpCommand, registerUiCommand } from './commands/index.js';
import { container } from './container.js';
const program = new Command();
/// inicio de la configuracion del programa de Cli
// Configuración del version y descripción del programa
program
    .name('ragnarok')
    .version(await getVersion())
    .description('A CLI tool for managing knowledge base');
//registrar comandos
registerUiCommand(program, container.knowledgeRepository, container.docRepository, container.docChunkRepository);
registerMcpCommand(program, container.knowledgeRepository, container.docRepository, container.docChunkRepository);
registerHttpCommand(program, container.knowledgeRepository, container.docRepository, container.docChunkRepository);
program.parse();
//# sourceMappingURL=index.js.map