import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';


let _monaco: typeof monaco; 

if (typeof window !== 'undefined') {
    loader.init().then(m => _monaco = m);
}

module.exports = new Proxy({}, {
    get(_, p, reciever) {
        return Reflect.get(_monaco, p, reciever);
    }
});
