import { parsePhoneNumberFromString } from "libphonenumber-js";

export const normalizePhoneNumber = (phone, defaultCountry = null) => {
  if (!phone) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(
    String(phone).trim(),
    defaultCountry || undefined,
  );

  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.number; // E.164
};

export const isValidPhoneNumber = (phone, defaultCountry = null) => {
  return Boolean(normalizePhoneNumber(phone, defaultCountry));
};
