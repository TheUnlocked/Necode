import { readFile } from 'fs/promises';
import { validate } from './validator';

const mikeFile = process.argv[2];

(async () => {
    const file = await readFile(mikeFile, { encoding: 'utf-8' });
    
    const { ok, messages } = await validate(file);

    for (const { message, details, err, severity } of messages) {
        const print = console[severity];
        const icon = { info: 'ℹ', warn: '⚠️', error: '🛑' }[severity];
        print(`${icon} ${message}`);
        details?.forEach(x => print(`\t${x}`));
        if (err) {
            if (err instanceof Error) {
                print(err.stack);
            }
            print(err);
        }
    }

    if (ok) {
        console.log("✔ Validation Passed.");
        console.warn("Passing validation does not mean a policy is necessarily bug-free.");
        console.warn("Manual and automated testing is always important to ensure correct behavior.");
    }
    else {
        process.exitCode = 1;
    }
    
})();

