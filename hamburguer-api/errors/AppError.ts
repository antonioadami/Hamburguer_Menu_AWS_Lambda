export default class AppError {
    constructor(public readonly statusCode: number, public readonly message: string) {}
}
