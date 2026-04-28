export class BadRequestError extends Error {
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}

export class UnauthorizedException extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedException";
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

export class ConflictException extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictException";
    this.statusCode = 409;
  }
}

export class NotFoundException extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundException";
    this.statusCode = 404;
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests") {
    super(message);
    this.name = "TooManyRequestsError";
    this.statusCode = 429;
  }
}

export class InternalServerError extends Error {
  constructor(message = "Internal server error") {
    super(message);
    this.name = "InternalServerError";
    this.statusCode = 500;
  }
}

export class ValidationException extends Error {
  constructor(message = "Validation failed", errors = []) {
    super(message);
    this.name = "ValidationException";
    this.statusCode = 422;
    this.errors = errors;
  }
}

export class CustomError extends Error {
  constructor(message = "Something went wrong", statusCode = 500) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
  }
}
