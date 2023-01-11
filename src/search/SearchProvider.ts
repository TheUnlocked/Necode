export default interface SearchProvider<T> {
    /** Return a score from 0 to 1 for how close of a match the query is to the object */
    getScore(obj: T, query: string): number;
}
