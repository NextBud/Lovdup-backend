import { BadRequestError } from "../classes/errorClasses.js";
import { pricingConfig } from "./pricing.config.js";

export const getPrice = (path) => {
  const keys = path.split(".");

  let current = pricingConfig;

  for (const key of keys) {
    current = current?.[key];

    if (!current) {
      throw new BadRequestError(`Invalid pricing path: ${path}`);
    }
  }

  if (!current.action || !Number.isInteger(current.amount)) {
    throw new BadRequestError(`Invalid pricing config for path: ${path}`);
  }

  return current;
};
