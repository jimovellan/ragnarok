import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type { Command } from 'commander';
import type { DbEngine } from '../config.js';
import { CONFIG_DIR, CONFIG_PATH } from '../env.js';
import { BACK, selectPrompt, textPrompt } from '../infrastructure/console/prompt.js';

const SQLITE_PATH = path.join(CONFIG_DIR, 'knowledge.sqlite');

/**
 * Registers the 'setup' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'setup' command will be added.
 */
export function registerSetupCommand(program: Command): void {
    program
        .command('setup')
        .description(`Interactive setup, writes config to ${CONFIG_PATH}`)
        .action(async () => {
            await runSetup();
        });
}

async function runSetup(): Promise<void> {
    const values: Record<string, string> = {};

    const dbEngine = await selectPrompt<DbEngine>('¿Qué motor de base de datos quieres usar?', [
        { label: 'SQLite (fichero local, sin dependencias)', value: 'sqlite' },
        { label: 'Postgres', value: 'postgres' },
    ]);
    if (dbEngine === BACK) return;
    values['DB_ENGINE'] = dbEngine;

    if (dbEngine === 'sqlite') {
        values['SQLITE_PATH'] = SQLITE_PATH;
    } else {
        const postgresValues = await promptValidPostgresConfig();
        if (postgresValues === BACK) return;
        Object.assign(values, postgresValues);
    }

    const ollamaBaseUrl = await textPrompt('URL de Ollama:', 'http://localhost:11434');
    if (ollamaBaseUrl === BACK) return;
    values['OLLAMA_BASE_URL'] = ollamaBaseUrl;

    writeConfigFile(values);

    console.log(`\nConfiguración guardada en ${CONFIG_PATH}`);
}

async function promptValidPostgresConfig(): Promise<Record<string, string> | typeof BACK> {
    const defaults = {
        host: 'localhost',
        port: '5432',
        user: 'postgres',
        password: '',
        database: 'ragnarok',
    };

    for (;;) {
        const host = await textPrompt('Host de Postgres:', defaults.host);
        if (host === BACK) return BACK;

        const port = await textPrompt('Puerto de Postgres:', defaults.port);
        if (port === BACK) return BACK;

        const user = await textPrompt('Usuario de Postgres:', defaults.user);
        if (user === BACK) return BACK;

        const password = await textPrompt('Password de Postgres:', defaults.password);
        if (password === BACK) return BACK;

        const database = await textPrompt('Base de datos de Postgres:', defaults.database);
        if (database === BACK) return BACK;

        defaults.host = host;
        defaults.port = port;
        defaults.user = user;
        defaults.password = password;
        defaults.database = database;

        const error = await testPostgresConnection({ host, port: Number(port), user, password, database });
        if (!error) {
            return {
                POSTGRES_HOST: host,
                POSTGRES_PORT: port,
                POSTGRES_USER: user,
                POSTGRES_PASSWORD: password,
                POSTGRES_DB: database,
            };
        }

        console.log(`\nNo se ha podido conectar a Postgres: ${error}\nInténtalo de nuevo.\n`);
    }
}

async function testPostgresConnection(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}): Promise<string | null> {
    const client = new pg.Client(options);
    try {
        await client.connect();
        return null;
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    } finally {
        await client.end().catch(() => undefined);
    }
}

function writeConfigFile(values: Record<string, string>): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const content = `${Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')}\n`;
    fs.writeFileSync(CONFIG_PATH, content, { mode: 0o600 });
}
