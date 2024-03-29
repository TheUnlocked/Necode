import * as Y from 'yjs';
import { YHandle } from '../hooks';
import { useYInit } from '../hooks/useY'; // eslint-disable-line @typescript-eslint/no-unused-vars

export { Awareness as YAwareness } from 'y-protocols/awareness';
export { Y };

/**
 * Use this to apply updates to a yjs document that every member of the network can perform while avoiding duplication.
 * If you just want to initialize document state, prefer the {@link useYInit} hook when possible.
 * @param y The document to update
 * @param update A callback. Changes to the document in this update will be reflected across the entire network one time
 */
export function applyUnifiedUpdates(y: YHandle, update: (doc: Y.Doc) => void) {
    // Initialize "default content" doc
    const unifiedDoc = new Y.Doc();
    unifiedDoc.clientID = 0;

    // Generate default content state
    update(unifiedDoc);

    // Apply default content state
    Y.applyUpdate(y._doc, Y.encodeStateAsUpdate(unifiedDoc));
}

export function applyTransaction(y: YHandle, update: (doc: Y.Doc) => void, origin?: any) {
    Y.transact(y._doc, () => {
        update(y._doc);
    }, origin);
}
