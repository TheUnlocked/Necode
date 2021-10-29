import Bimap from "../../src/util/maps/Bimap";
import { Classroom } from "./Classroom";
import { Username } from "./types";

export default class UserManager {
    usernameIdMap = new Bimap<Username, string>();

    fromUsername(username: Username) {
        return this.usernameIdMap.getByKey(username);
    }

    toUsername(socketId: string) {
        return this.usernameIdMap.getByValue(socketId);
    }
    
    add(username: Username, id: string) {
        this.usernameIdMap.set(username, id);
    }

    deleteByUsername(username: Username) {
        this.usernameIdMap.deleteByKey(username);
    }

    deleteById(id: string) {
        this.usernameIdMap.deleteByValue(id);
    }
}