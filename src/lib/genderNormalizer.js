/**
 * genderNormalizer.js
 *
 * The onboarding frontend sends gender as display strings ("Woman", "Man",
 * "Non-binary"). The Prisma Gender enum requires uppercase ("WOMAN", "MAN",
 * "NON_BINARY"). This module normalizes values in both directions so the
 * mismatch is handled in one place and never leaks into business logic.
 */

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

/** Frontend display value → Prisma enum */
const TO_ENUM = {
  woman: "WOMAN",
  man: "MAN",
  "non-binary": "NON_BINARY",
  nonbinary: "NON_BINARY",
  // Already-correct values pass through
  WOMAN: "WOMAN",
  MAN: "MAN",
  NON_BINARY: "NON_BINARY",
};

/** Prisma enum → frontend display value */
const TO_DISPLAY = {
  WOMAN: "Woman",
  MAN: "Man",
  NON_BINARY: "Non-binary",
};

// The full set of valid enum values for guard checks
export const VALID_GENDER_ENUMS = new Set(["WOMAN", "MAN", "NON_BINARY"]);

// ---------------------------------------------------------------------------
// Single value
// ---------------------------------------------------------------------------

/**
 * Normalize a single gender string to its Prisma enum value.
 * Returns null if the value is not recognized.
 *
 * @param {string | null | undefined} value
 * @returns {"WOMAN" | "MAN" | "NON_BINARY" | null}
 *
 * @example
 *   normalizeGender("Woman")      // "WOMAN"
 *   normalizeGender("non-binary") // "NON_BINARY"
 *   normalizeGender("WOMAN")      // "WOMAN"
 *   normalizeGender("alien")      // null
 */
export const normalizeGender = (value) => {
  if (!value) return null;
  return TO_ENUM[value.trim()] ?? TO_ENUM[value.trim().toLowerCase()] ?? null;
};

/**
 * Same as normalizeGender but throws if the value is not recognized.
 * Use this in validation middleware where an unknown gender should be
 * a hard 400, not a silent null.
 */
export const normalizeGenderOrThrow = (value) => {
  const result = normalizeGender(value);
  if (!result) {
    throw new Error(
      `Invalid gender value "${value}". Expected one of: Woman, Man, Non-binary`,
    );
  }
  return result;
};

// ---------------------------------------------------------------------------
// Array (for preferredGenders)
// ---------------------------------------------------------------------------

/**
 * Normalize an array of gender strings to Prisma enum values.
 * Filters out any unrecognized values silently.
 *
 * @param {string[]} values
 * @returns {("WOMAN" | "MAN" | "NON_BINARY")[]}
 *
 * @example
 *   normalizeGenders(["Woman", "Non-binary"]) // ["WOMAN", "NON_BINARY"]
 */
export const normalizeGenders = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeGender).filter(Boolean);
};

/**
 * Same as normalizeGenders but throws if any value is unrecognized.
 */
export const normalizeGendersOrThrow = (values) => {
  if (!Array.isArray(values)) {
    throw new Error("preferredGenders must be an array");
  }
  return values.map(normalizeGenderOrThrow);
};

// ---------------------------------------------------------------------------
// Display (backend → frontend)
// ---------------------------------------------------------------------------

/**
 * Convert a Prisma Gender enum value back to a display string.
 * Used when serializing profile data for API responses.
 *
 * @param {"WOMAN" | "MAN" | "NON_BINARY" | null | undefined} value
 * @returns {string | null}
 *
 * @example
 *   genderToDisplay("NON_BINARY") // "Non-binary"
 */
export const genderToDisplay = (value) => {
  if (!value) return null;
  return TO_DISPLAY[value] ?? null;
};
