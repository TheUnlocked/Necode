import * as Y from 'yjs';

/**
 * Use this to apply updates to a yjs document that every member of the network can perform while avoiding duplication.
 * This is often used for initializing the document state
 * @param doc The document to update
 * @param update A callback. Changes to the document in this update will be reflected across the entire network one time
 */
export function applyUnifiedUpdates(doc: Y.Doc, update: (doc: Y.Doc) => void) {
    // Initialize "default content" doc
    const unifiedDoc = new Y.Doc();
    unifiedDoc.clientID = 0;

    // Generate default content state
    update(unifiedDoc);

    // Apply default content state
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(unifiedDoc));
}

export function applyTransaction(doc: Y.Doc, update: (doc: Y.Doc) => void, origin?: any) {
    Y.transact(doc, () => {
        update(doc);
    }, origin);
}
