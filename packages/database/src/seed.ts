import { PrismaClient } from '@prisma/client';
import { exec as execCallback } from 'child_process';
import { createReadStream } from 'fs';
import path from 'path';
import { promisify } from 'util';
import apiPlugin from '../../../apps/necode/pages/api/plugin'; 

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    process.exit();
}

console.log('Recognized development environment, performing seeding...');

async function performStep<T>(name: string, step: () => Promise<T>): Promise<T> {
    process.stdout.write(`${name}...`);
    const value = await step();
    process.stdout.write(' Done.\n');
    return value;
}

const exec = promisify(execCallback);

(async () => {
    const prisma = new PrismaClient();
    
    const ADMIN_USERNAME = '@dev_admin';

    const user = await performStep('Creating admin user', () =>
        prisma.user.create({
            data: {
                username: ADMIN_USERNAME,
                displayName: ADMIN_USERNAME,
                firstName: 'Dev',
                lastName: ADMIN_USERNAME,
                email: `${ADMIN_USERNAME}-noreply@necode.invalid`,
                rights: 'Admin',
                classes: { create: {
                    role: 'Instructor',
                    classroom: { create: {
                        displayName: 'Test Classroom',
                    } }
                } }
            }
        })
    );

    const corePath = path.resolve(__dirname, '../../core');

    const corePackedFilename = await performStep('Packing core plugin', () =>
        exec('pnpm pack', { cwd: corePath }).then(x => x.stdout.trim())
    );

    await performStep('Uploading core plugin', () =>
        apiPlugin.POST.execute(
            {
                session: { user, expires: '' },
                query: {},
                body: undefined as any,
                bodyStream: createReadStream(path.join(corePath, corePackedFilename)),
            }
        )
    );

    console.log('Done seeding!');

})();

