import * as Y from 'yjs';
export { Awareness as YAwareness } from 'y-protocols/awareness';
import { YHandle } from '../hooks';
export { Y };

/**
 * Use this to apply updates to a yjs document that every member of the network can perform while avoiding duplication.
 * This is often used for initializing the document state
 * @param doc The document to update
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
