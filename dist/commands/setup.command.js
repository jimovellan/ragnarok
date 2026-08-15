import fs from 'node:fs';
import { CONFIG_DIR, CONFIG_PATH } from '../env.js';
import { BACK, selectPrompt, textPrompt } from '../infrastructure/console/prompt.js';
/**
 * Registers the 'setup' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'setup' command will be added.
 */
export function registerSetupCommand(program) {
    program
        .command('setup')
        .description(`Interactive setup, writes config to ${CONFIG_PATH}`)
        .action(async () => {
        await runSetup();
    });
}
async function runSetup() {
    const values = {};
    const dbEngine = await selectPrompt('¿Qué motor de base de datos quieres usar?', [
        { label: 'SQLite (fichero local, sin dependencias)', value: 'sqlite' },
        { label: 'Postgres', value: 'postgres' },
    ]);
    if (dbEngine === BACK)
        return;
    values['DB_ENGINE'] = dbEngine;
    if (dbEngine === 'sqlite') {
        const sqlitePath = await textPrompt('Ruta del fichero SQLite:', './data/knowledge.sqlite');
        if (sqlitePath === BACK)
            return;
        values['SQLITE_PATH'] = sqlitePath;
    }
    else {
        const host = await textPrompt('Host de Postgres:', 'localhost');
        if (host === BACK)
            return;
        values['POSTGRES_HOST'] = host;
        const port = await textPrompt('Puerto de Postgres:', '5432');
        if (port === BACK)
            return;
        values['POSTGRES_PORT'] = port;
        const user = await textPrompt('Usuario de Postgres:', 'postgres');
        if (user === BACK)
            return;
        values['POSTGRES_USER'] = user;
        const password = await textPrompt('Password de Postgres:', '');
        if (password === BACK)
            return;
        values['POSTGRES_PASSWORD'] = password;
        const database = await textPrompt('Base de datos de Postgres:', 'ragnarok');
        if (database === BACK)
            return;
        values['POSTGRES_DB'] = database;
    }
    const ollamaBaseUrl = await textPrompt('URL de Ollama:', 'http://localhost:11434');
    if (ollamaBaseUrl === BACK)
        return;
    values['OLLAMA_BASE_URL'] = ollamaBaseUrl;
    const ollamaEmbeddingModel = await textPrompt('Modelo de embeddings de Ollama:', 'paraphrase-multilingual');
    if (ollamaEmbeddingModel === BACK)
        return;
    values['OLLAMA_EMBEDDING_MODEL'] = ollamaEmbeddingModel;
    writeConfigFile(values);
    console.log(`\nConfiguración guardada en ${CONFIG_PATH}`);
}
function writeConfigFile(values) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const content = `${Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')}\n`;
    fs.writeFileSync(CONFIG_PATH, content, { mode: 0o600 });
}
//# sourceMappingURL=setup.command.js.map