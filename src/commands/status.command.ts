import type { Command } from 'commander';
import { getVersion } from '../common/common.utils.js';
import { config } from '../config.js';
import { CONFIG_PATH } from '../env.js';
import { checkForUpdate } from '../infrastructure/update/check-update.js';

/**
 * Registers the 'status' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'status' command will be added.
 */
export function registerStatusCommand(program: Command): void {
    program
        .command('status')
        .description('Show CLI version, configuration and check for updates')
        .action(async () => {
            const version = await getVersion();
            console.log(`ragnarok v${version}`);
            console.log(`Config: ${CONFIG_PATH}`);
            console.log(`Motor de base de datos: ${config.dbEngine}`);

            if (config.dbEngine === 'sqlite') {
                console.log(`Fichero SQLite: ${config.sqlite.path}`);
            } else {
                console.log(
                    `Postgres: ${config.postgres.user}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`,
                );
            }

            console.log(`Ollama: ${config.ollamaBaseUrl} (modelo: ${config.ollamaEmbeddingModel})`);

            console.log('\nComprobando actualizaciones...');
            const { current, latest, updateAvailable } = await checkForUpdate();

            if (latest === null) {
                console.log('No se ha podido comprobar si hay una versión nueva (sin conexión al registro de npm).');
            } else if (updateAvailable) {
                console.log(`Hay una nueva versión disponible: ${latest} (tienes ${current}). Ejecuta "ragnarok update" para actualizar.`);
            } else {
                console.log('Estás usando la última versión.');
            }
        });
}
