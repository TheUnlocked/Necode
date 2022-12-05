import * as Y from 'yjs';

export function applyUnifiedUpdates(doc: Y.Doc, update: (doc: Y.Doc) => void, unifiedChannel = 0) {
    // Initialize "default content" doc
    const unifiedDoc = new Y.Doc();
    unifiedDoc.clientID = unifiedChannel;

    // Generate default content state
    update(unifiedDoc);

    // Apply default content state
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(unifiedDoc));
}
