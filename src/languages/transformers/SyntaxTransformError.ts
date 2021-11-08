export default class SyntaxTransformError extends Error {
    readonly name = "SyntaxTransformError";

    private _message: string;

    get message() {
        return this._message;
    }

    set message(_) {}

    constructor(message: string) {
        super(message);
        this._message = message;
    }
}