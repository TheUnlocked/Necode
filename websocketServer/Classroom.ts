export class Classroom {
    users = new Set<string>();
    instructors = new Set<string>();

    constructor(public name: string) {}
}