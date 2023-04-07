import { Stream } from 'stream';

/** https://stackoverflow.com/a/49428486 */
export function streamToPromise(stream: Stream) {
    const chunks = [] as Buffer[];
    return new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}