export class DepositError extends Error {
    errors: string[];

    constructor(message: string, errors: string[]) {
        super(message);
        this.name = "DepositError";
        this.errors = errors;
    }
}
