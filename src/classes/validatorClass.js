import { ValidationException } from "./errorClasses.js";

class ValidatorClass {
  validate(schema, value) {
    const { error, value: validatedValue } = schema.validate(value ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((item) => ({
        field: item.path.join("."),
        message: item.message,
      }));

      throw new ValidationException("Validation failed", errors);
    }

    return validatedValue;
  }

  body(schema, req) {
    const validatedBody = this.validate(schema, req.body);
    req.body = validatedBody;

    return validatedBody;
  }

  query(schema, req) {
    const validatedQuery = this.validate(schema, req.query);

    req.validatedQuery = validatedQuery;

    return validatedQuery;
  }

  params(schema, req) {
    const validatedParams = this.validate(schema, req.params);

    req.validatedParams = validatedParams;

    return validatedParams;
  }
}

export const validator = new ValidatorClass();
