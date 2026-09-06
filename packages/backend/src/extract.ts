import { Stream } from 'stream';
import { Parser as TarParser } from 'tar';
import { createGunzip } from 'zlib';
import { streamToPromise } from './streams';

export async function extractTgz(stream: Stream) {
    return new Promise<{ [filename: string]: Buffer }>((resolve, reject) => {
        const files = [] as Promise<[string, Buffer]>[];
        stream
            .on('error', reject)
            .pipe(createGunzip())
            .on('error', reject)
            .pipe(new TarParser())
            .on('entry', async e => {
                files.push(Promise.resolve([e.path, await streamToPromise(e)]));
            })
            .on('end', () =>
                Promise.all(files)
                    .then(Object.fromEntries)
                    .then(resolve)
                    .catch(reject)
            );
    });
}