import { readFile } from 'fs/promises';
import { validate } from './validator';

const mikeFile = process.argv[2];

(async () => {
    const file = await readFile(mikeFile, { encoding: 'utf-8' });
    
    if (await validate(file)) {
        console.log("✔ Validation Passed.");
        console.warn("Passing validation does not mean a policy is necessarily bug-free.");
        console.warn("Manual and automated testing is always important to ensure correct behavior.");
    }
    
})();

