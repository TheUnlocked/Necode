import { expect } from 'chai';
import { describe, it } from 'mocha';
import AutoRing, { AutoRingOptions } from '../../src/util/AutoRing';

type RingSpy<T> = { type: 'link' | 'unlink', from: T, to: T }[] & { 
    clear(): void;
};

function createRingOptions<T>(): [RingSpy<T>, AutoRingOptions<T>] {
    const spy = Object.assign([], {
        clear() {
            spy.length = 0;
        }
    }) as RingSpy<T>;
    return [spy, {
        linkHandler(from, to) {
            spy.push({ type: 'link', from, to });
        },
        unlinkHandler(from, to) {
            spy.push({ type: 'unlink', from, to });
        }
    }];
}

describe('AutoRing', () => {
    describe('initialization', () => {
        it('should correctly initialize no elements', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            expect(spy).to.have.lengthOf(0);
        });
    
        it('should correctly initialize one element', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing(['a'], options);
    
            expect(spy).to.be.lengthOf(1);
            expect(spy[0]).deep.equal({ type: 'link', from: 'a', to: 'a' });
        });
    
        it('should correctly initialize two elements', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing(['a', 'b'], options);
    
            expect(spy).to.be.lengthOf(2);
            expect(spy).to.deep.contain({ type: 'link', from: 'a', to: 'b' });
            expect(spy).to.deep.contain({ type: 'link', from: 'b', to: 'a' });
        });

        it('should correctly initialize many elements', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing(['a', 'b', 'c', 'd'], options);
    
            expect(spy).to.be.lengthOf(4);
            expect(spy.map(x => x.type)).to.not.have.any.members(['unlink']);
        });
    });

    describe('adding elements', () => {
        it('should fail to add an existing element', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing(['a'], options);
    
            spy.clear();
            ring.add('a');

            expect(spy).to.have.lengthOf(0);
            
            ring.add('b');
            spy.clear();
            ring.add('a');
            ring.add('b');

            expect(spy).to.have.lengthOf(0);
        });

        it('should correctly add an element from 0 -> 1', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');

            expect(spy).to.have.lengthOf(1);
            expect(spy[0]).to.deep.equal({ type: 'link', from: 'a', to: 'a' });
        });

        it('should correctly add an element from 1 -> 2', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            spy.clear();

            ring.add('b');

            expect(spy).to.have.lengthOf(3);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'a', to: 'a' });
            expect(spy[1]).to.deep.equal({ type: 'link', from: 'a', to: 'b' });
            expect(spy[2]).to.deep.equal({ type: 'link', from: 'b', to: 'a' });
        });

        it('should correctly add an element from 2 -> 3', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            ring.add('b');
            spy.clear();
            
            ring.add('c');

            expect(spy).to.have.lengthOf(3);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'b', to: 'a' });
            expect(spy[1]).to.deep.equal({ type: 'link', from: 'b', to: 'c' });
            expect(spy[2]).to.deep.equal({ type: 'link', from: 'c', to: 'a' });
        });

        it('should correctly add an element from 3 -> 4', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            ring.add('b');
            ring.add('c');
            spy.clear();
            
            ring.add('d');

            expect(spy).to.have.lengthOf(3);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'c', to: 'a' });
            expect(spy[1]).to.deep.equal({ type: 'link', from: 'c', to: 'd' });
            expect(spy[2]).to.deep.equal({ type: 'link', from: 'd', to: 'a' });
        });
    });

    describe('removing elements', () => {
        it('should fail to remove a non-existent element', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.remove('a');
            expect(spy).to.have.lengthOf(0);
            
            ring.add('a');
            ring.remove('a');
            spy.clear();
            
            ring.remove('a');
            expect(spy).to.have.lengthOf(0);
        });

        it('should correctly remove an element from 1 -> 0', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            spy.clear();

            ring.remove('a');

            expect(spy).to.have.lengthOf(1);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'a', to: 'a' });
        });

        it('should correctly remove an element from 2 -> 1', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            ring.add('b');
            spy.clear();

            ring.remove('a');

            expect(spy).to.have.lengthOf(3);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'b', to: 'a' });
            expect(spy[1]).to.deep.equal({ type: 'unlink', from: 'a', to: 'b' });
            expect(spy[2]).to.deep.equal({ type: 'link', from: 'b', to: 'b' });
        });

        it('should correctly remove an element from 3 -> 2', () => {
            const [spy, options] = createRingOptions();
            const ring = new AutoRing([], options);
    
            ring.add('a');
            ring.add('b');
            ring.add('c');
            spy.clear();

            ring.remove('c');

            expect(spy).to.have.lengthOf(3);
            expect(spy[0]).to.deep.equal({ type: 'unlink', from: 'b', to: 'c' });
            expect(spy[1]).to.deep.equal({ type: 'unlink', from: 'c', to: 'a' });
            expect(spy[2]).to.deep.equal({ type: 'link', from: 'b', to: 'a' });
        });
    });
});