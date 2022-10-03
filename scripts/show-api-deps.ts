import { nodeFileTrace } from '@vercel/nft';
import { sync } from 'glob';
import * as path from 'path';

function isFrontendFile(fn: string) {
    return /mui|(?<!p)react/.test(fn);
}

function pretty(fn: string) {
    return fn.replace(/^node_modules[\\/]|\.[jt]sx?$|\/index\.[jt]sx$/g, '').replaceAll('\\', '/');
}

(async () => {
    const search = path.join(__dirname, '../pages/api/**/*').replaceAll('\\', '/');
    console.log('Searching for glob:', search);
    const apiRouteFilenames = sync(search, { nodir: true });
    console.log('API routes:', apiRouteFilenames.map(x => path.relative(path.join(__dirname, '..'), x)).join(', '));
    const { fileList, reasons } = await nodeFileTrace(apiRouteFilenames);

    [...fileList].filter(isFrontendFile).forEach(filename => {
        const reason = reasons.get(filename)!;
        console.log(`⚠️  Found frontend file '${pretty(filename)}' imported by the serverless functions!`);
        console.log(`\tReason: ${reason.type} from ${[...reason.parents].map(pretty).join(', ')}`);
    });

    console.log('\nBackend files:', [...fileList].filter(x => !isFrontendFile(x)).map(pretty).join(', '));
})();
