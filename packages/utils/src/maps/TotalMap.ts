import IMap from './IMap';

export default abstract class TotalMap<K, V> extends Map<K, V> implements IMap<K, V> {
    abstract getDefault(): V;

    override get(key: K) {
        let value = super.get(key);
        if (!value) {
            value = this.getDefault();
            this.set(key, value);
        }
        return value;
    }
}