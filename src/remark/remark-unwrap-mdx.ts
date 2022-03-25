import { visit, SKIP, Visitor } from 'unist-util-visit';
import type { Plugin } from 'unified';

const remarkUnwrapMdx: Plugin = () => {
    
    const visitor: Visitor = (node, index, parent) => {
        // if there are children available keep diving into them
        if ('children' in node) {
            // @ts-ignore
            for (const child of node.children) {
                visit(child, visitor);
            }

            // if an mdxBlockElement has a paragraph as a child, remove the paragraph layer
            if (node.type === 'paragraph' && parent && parent.type === 'mdxJsxFlowElement') {
                // @ts-ignore
                parent.children.splice(index!, 1, ...node.children);
                return [SKIP, index];
            }
        }
    };

    return tree => visit(tree, visitor);
};

export default remarkUnwrapMdx;