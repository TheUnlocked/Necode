interface UserDetails {
    userId: string;
    // username: string;
}

export default class UserManager {
    private map = new Map<string, UserDetails>();

    add(id: string, userId: string) {
        return this.map.set(id, { userId });
    }

    get(id: string) {
        return this.map.get(id);
    }

    delete(id: string) {
        return this.map.delete(id);
    }
}