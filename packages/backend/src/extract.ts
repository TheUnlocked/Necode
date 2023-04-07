import { Stream } from 'stream';
import { createGunzip } from 'zlib';
import { Parse as TarParse } from 'tar';
import { streamToPromise } from './streams';

export async function extractTgz(stream: Stream) {
    return new Promise<{ [filename: string]: Buffer }>((resolve, reject) => {
        const files = [] as Promise<[string, Buffer]>[];
        stream
            .on('error', reject)
            .pipe(createGunzip())
            .on('error', reject)
            .pipe(new TarParse())
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