import { spawn } from 'node:child_process';
import type { Command } from 'commander';
import { getPackageName } from '../common/common.utils.js';
import { checkForUpdate } from '../infrastructure/update/check-update.js';

/**
 * Registers the 'update' command to the provided Commander program.
 *
 * @param program - The Commander program instance to which the 'update' command will be added.
 */
export function registerUpdateCommand(program: Command): void {
    program
        .command('update')
        .description('Update ragnarok to the latest version (npm install -g)')
        .action(async () => {
            console.log('Comprobando la última versión disponible...');
            const { current, latest, updateAvailable } = await checkForUpdate();

            if (latest === null) {
                console.error('No se ha podido contactar con el registro de npm. Comprueba tu conexión.');
                process.exit(1);
            }

            if (!updateAvailable) {
                console.log(`Ya tienes la última versión instalada (${current}).`);
                return;
            }

            const packageName = await getPackageName();
            console.log(`Actualizando ${packageName} de ${current} a ${latest}...`);

            await new Promise<void>((resolve, reject) => {
                const child = spawn('npm', ['install', '-g', `${packageName}@latest`], { stdio: 'inherit' });
                child.on('error', reject);
                child.on('exit', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`npm install salió con código ${code}`));
                    }
                });
            });

            console.log(`Actualizado a la versión ${latest}.`);
        });
}
