import * as compatibilityScoreDb from "./compatibilityScore.db.js";

// ---------------------------------------------------------------------------
// COMPATIBILITY CONFIGURATION
// ---------------------------------------------------------------------------
//
// Compatibility is directional:
//
//   viewer preferences + candidate profile
//                         ↓
//                   viewer → candidate
//
// A → B does NOT necessarily equal B → A.
//
// Total = 100
//
// Identity   = 25
// Values     = 30
// Lifestyle = 25
// Location   = 20
//
// ---------------------------------------------------------------------------

const WEIGHTS = {
  identity: 25,
  values: 30,
  lifestyle: 25,
  location: 20,
};

const MAX_SCORE = 98;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalize = (value) => {
  if (value === null || value === undefined) return "";

  return String(value).trim().toLowerCase();
};

const sameValue = (a, b) => {
  const left = normalize(a);
  const right = normalize(b);

  return left !== "" && left === right;
};

const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const dob = new Date(birthDate);

  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const isOpenPreference = (value) => {
  const normalized = normalize(value);

  return [
    "",
    "any",
    "anyone",
    "open",
    "open to all",
    "doesn't matter",
    "does not matter",
    "no preference",
    "anywhere",
  ].includes(normalized);
};

const addMatched = (reasons, message) => {
  reasons.matched.push(message);
};

const addMissed = (reasons, message) => {
  reasons.missed.push(message);
};

// ---------------------------------------------------------------------------
// Identity — 25 points
// ---------------------------------------------------------------------------
//
// Gender = 10
// Age    = 15
//
// ---------------------------------------------------------------------------

const scoreIdentity = (preference, candidateIdentity, reasons) => {
  if (!candidateIdentity) {
    addMissed(reasons, "Candidate identity profile unavailable");
    return 0;
  }

  let score = 0;

  // Gender ---------------------------------------------------------------

  const preferredGenders = preference.preferredGenders ?? [];

  if (preferredGenders.length === 0) {
    score += 10;
    addMatched(reasons, "No gender restriction");
  } else if (preferredGenders.includes(candidateIdentity.gender)) {
    score += 10;
    addMatched(reasons, "Gender preference matched");
  } else {
    addMissed(reasons, "Gender outside preference");
  }

  // Age -----------------------------------------------------------------

  const candidateAge = calculateAge(candidateIdentity.birthDate);

  const ageMin = preference.ageMin ?? 18;
  const ageMax = preference.ageMax ?? 99;

  if (candidateAge === null) {
    addMissed(reasons, "Candidate age unavailable");
  } else if (candidateAge >= ageMin && candidateAge <= ageMax) {
    score += 15;

    addMatched(
      reasons,
      `Age ${candidateAge} within preferred range ${ageMin}–${ageMax}`,
    );
  } else {
    addMissed(
      reasons,
      `Age ${candidateAge} outside preferred range ${ageMin}–${ageMax}`,
    );
  }

  return Math.min(score, WEIGHTS.identity);
};

// ---------------------------------------------------------------------------
// Values — 30 points
// ---------------------------------------------------------------------------
//
// Religion            = 8
// Children            = 8
// Communication       = 5
// Tuesday feeling     = 4
// Faith practice      = 5
//
// IMPORTANT:
// faithPractice currently exists only on MatchPreference.
// There is no corresponding candidate-side field in the profile schema
// represented by the current service.
//
// Therefore faithPractice receives NO score until a candidate-side field
// exists.
//
// To avoid manufacturing compatibility, the active score is:
//
// Religion          = 8
// Children          = 8
// Communication     = 5
// Tuesday           = 4
// ---------------------------------------------------------------------------

const scoreValues = (preference, candidateValues, reasons) => {
  if (!candidateValues) {
    addMissed(reasons, "Candidate values profile unavailable");
    return 0;
  }

  let score = 0;

  // Religion ------------------------------------------------------------

  if (isOpenPreference(preference.religionPreference)) {
    score += 8;
    addMatched(reasons, "Open regarding religion");
  } else if (
    sameValue(preference.religionPreference, candidateValues.religion)
  ) {
    score += 8;
    addMatched(reasons, "Religion preference matched");
  } else {
    addMissed(reasons, "Religion preference did not match");
  }

  // Children ------------------------------------------------------------

  if (isOpenPreference(preference.childrenPreference)) {
    score += 8;
    addMatched(reasons, "Open regarding children");
  } else if (
    sameValue(preference.childrenPreference, candidateValues.childrenPreference)
  ) {
    score += 8;
    addMatched(reasons, "Children preference matched");
  } else {
    addMissed(reasons, "Children preference did not match");
  }

  // Communication -------------------------------------------------------

  if (isOpenPreference(preference.communicationStyle)) {
    score += 5;
    addMatched(reasons, "Open regarding communication style");
  } else if (
    sameValue(preference.communicationStyle, candidateValues.personalCommStyle)
  ) {
    score += 5;
    addMatched(reasons, "Communication style matched");
  } else {
    addMissed(reasons, "Communication style differs");
  }

  // Tuesday feeling -----------------------------------------------------

  if (isOpenPreference(preference.tuesdayFeeling)) {
    score += 4;
    addMatched(reasons, "Open regarding Tuesday feeling");
  } else if (
    sameValue(preference.tuesdayFeeling, candidateValues.personalTuesdayVibe)
  ) {
    score += 4;
    addMatched(reasons, "Tuesday feeling matched");
  } else {
    addMissed(reasons, "Tuesday feeling differs");
  }

  //
  // faithPractice deliberately does not contribute here.
  //
  // The preference exists, but there is currently no candidate-side
  // comparison field.
  //

  return Math.min(score, WEIGHTS.values);
};

// ---------------------------------------------------------------------------
// Lifestyle — 25 points
// ---------------------------------------------------------------------------
//
// Social level            = 5
// Lifestyle preference    = 7
// Financial stability     = 6
// Financial stage         = 7
//
// ---------------------------------------------------------------------------

const scoreLifestyle = (preference, candidateLifestyle, reasons) => {
  if (!candidateLifestyle) {
    addMissed(reasons, "Candidate lifestyle profile unavailable");
    return 0;
  }

  let score = 0;

  // Social level --------------------------------------------------------

  if (isOpenPreference(preference.socialLevel)) {
    score += 5;
    addMatched(reasons, "Open regarding social level");
  } else if (sameValue(preference.socialLevel, candidateLifestyle.socialLife)) {
    score += 5;
    addMatched(reasons, "Social level matched");
  } else {
    addMissed(reasons, "Social level differs");
  }

  // Lifestyle -----------------------------------------------------------

  if (isOpenPreference(preference.lifestylePreference)) {
    score += 7;
    addMatched(reasons, "Open regarding lifestyle");
  } else {
    const preferenceValue = normalize(preference.lifestylePreference);

    const drinking = normalize(candidateLifestyle.drinking);
    const smoking = normalize(candidateLifestyle.smoking);

    const drinkingMatch = drinking !== "" && preferenceValue.includes(drinking);

    const smokingMatch = smoking !== "" && preferenceValue.includes(smoking);

    if (drinkingMatch || smokingMatch) {
      score += 7;
      addMatched(reasons, "Lifestyle preference matched");
    } else {
      addMissed(reasons, "Lifestyle preference differs");
    }
  }

  // Financial stability -------------------------------------------------

  if (isOpenPreference(preference.financialStabilityPreference)) {
    score += 6;
    addMatched(reasons, "Open regarding financial stability");
  } else if (
    sameValue(
      preference.financialStabilityPreference,
      candidateLifestyle.moneyStyle,
    )
  ) {
    score += 6;
    addMatched(reasons, "Financial stability preference matched");
  } else {
    addMissed(reasons, "Financial stability preference differs");
  }

  // Financial stage -----------------------------------------------------

  if (isOpenPreference(preference.financialStagePreference)) {
    score += 7;
    addMatched(reasons, "Open regarding financial stage");
  } else if (
    sameValue(
      preference.financialStagePreference,
      candidateLifestyle.financialStatus,
    )
  ) {
    score += 7;
    addMatched(reasons, "Financial stage preference matched");
  } else {
    addMissed(reasons, "Financial stage preference differs");
  }

  return Math.min(score, WEIGHTS.lifestyle);
};

// ---------------------------------------------------------------------------
// Location — 20 points
// ---------------------------------------------------------------------------
//
// Same city     = 20
// Same country  = 15
// Anywhere      = 20
//
// ---------------------------------------------------------------------------

const scoreLocation = (
  preference,
  viewerIdentity,
  candidateIdentity,
  candidateLifestyle,
  reasons,
) => {
  if (!candidateIdentity) {
    addMissed(reasons, "Candidate location unavailable");
    return 0;
  }

  const locationPreference = normalize(preference.locationPreference);

  // Anywhere ------------------------------------------------------------

  if (!locationPreference || locationPreference === "anywhere") {
    addMatched(reasons, "Location preference is open");
    return WEIGHTS.location;
  }

  if (!viewerIdentity) {
    addMissed(reasons, "Viewer location unavailable");
    return 0;
  }

  // Same city -----------------------------------------------------------

  if (locationPreference === "same city") {
    const sameCity =
      viewerIdentity.residenceCity &&
      candidateIdentity.residenceCity &&
      sameValue(viewerIdentity.residenceCity, candidateIdentity.residenceCity);

    if (sameCity) {
      addMatched(reasons, "Same city");
      return 20;
    }

    const sameCountry =
      viewerIdentity.residenceCountry &&
      candidateIdentity.residenceCountry &&
      sameValue(
        viewerIdentity.residenceCountry,
        candidateIdentity.residenceCountry,
      );

    if (sameCountry) {
      addMatched(reasons, "Same country, different city");
      return 10;
    }

    const relocation = normalize(candidateLifestyle?.relocationFeelings);

    if (
      relocation.includes("open") ||
      relocation.includes("depends") ||
      relocation.includes("maybe")
    ) {
      addMatched(reasons, "Different city but candidate is open to relocation");

      return 7;
    }

    addMissed(reasons, "Different city");
    return 3;
  }

  // Same country --------------------------------------------------------

  if (locationPreference === "same country") {
    const sameCountry =
      viewerIdentity.residenceCountry &&
      candidateIdentity.residenceCountry &&
      sameValue(
        viewerIdentity.residenceCountry,
        candidateIdentity.residenceCountry,
      );

    if (sameCountry) {
      addMatched(reasons, "Same country");
      return 20;
    }

    const relocation = normalize(candidateLifestyle?.relocationFeelings);

    if (
      relocation.includes("open") ||
      relocation.includes("depends") ||
      relocation.includes("maybe")
    ) {
      addMatched(
        reasons,
        "Different country but candidate is open to relocation",
      );

      return 10;
    }

    addMissed(reasons, "Different country");
    return 5;
  }

  // Unknown -------------------------------------------------------------

  addMissed(reasons, "Unknown location preference");
  return 5;
};

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export const calculateCompatibilityBreakdown = ({
  viewerPreference,
  viewerProfile,
  candidate,
}) => {
  const candidateProfile = candidate?.profile;

  if (!candidateProfile) {
    return {
      score: 0,
      identityScore: 0,
      valuesScore: 0,
      lifestyleScore: 0,
      locationScore: 0,

      reasons: {
        matched: [],
        missed: ["Candidate has no profile"],
      },
    };
  }

  const candidateIdentity = candidateProfile.identity ?? null;
  const candidateValues = candidateProfile.values ?? null;
  const candidateLifestyle = candidateProfile.lifestyle ?? null;

  const viewerIdentity = viewerProfile?.identity ?? null;

  const reasons = {
    matched: [],
    missed: [],
  };

  const identityScore = scoreIdentity(
    viewerPreference,
    candidateIdentity,
    reasons,
  );

  const valuesScore = scoreValues(viewerPreference, candidateValues, reasons);

  const lifestyleScore = scoreLifestyle(
    viewerPreference,
    candidateLifestyle,
    reasons,
  );

  const locationScore = scoreLocation(
    viewerPreference,
    viewerIdentity,
    candidateIdentity,
    candidateLifestyle,
    reasons,
  );

  const rawScore = identityScore + valuesScore + lifestyleScore + locationScore;

  const score = Math.min(rawScore, MAX_SCORE);

  return {
    score,
    identityScore,
    valuesScore,
    lifestyleScore,
    locationScore,
    reasons,
  };
};

// ---------------------------------------------------------------------------
// Persisted calculation
// ---------------------------------------------------------------------------

export const calculateAndUpsertCompatibilityScore = async ({
  viewerId,
  candidate,
  viewerPreference,
  viewerProfile = null,
  viewerIdentity = null,
  trx = null,
}) => {
  const breakdown = calculateCompatibilityBreakdown({
    viewerPreference,
    viewerProfile:
      viewerProfile ??
      (viewerIdentity
        ? {
            identity: viewerIdentity,
          }
        : null),
    candidate,
  });

  return compatibilityScoreDb.upsertByUserPair(
    {
      // Direction matters.
      //
      // viewerId -> candidate.id
      //
      userAId: viewerId,
      userBId: candidate.id,

      score: breakdown.score,
      identityScore: breakdown.identityScore,
      valuesScore: breakdown.valuesScore,
      lifestyleScore: breakdown.lifestyleScore,
      locationScore: breakdown.locationScore,
      reasons: breakdown.reasons,
    },
    trx,
  );
};

// ---------------------------------------------------------------------------
// Non-persisted calculation
// ---------------------------------------------------------------------------

export const calculateCompatibilityScore = ({
  viewerPreference,
  viewerProfile = null,
  viewerIdentity = null,
  candidate,
}) => {
  return calculateCompatibilityBreakdown({
    viewerPreference,
    viewerProfile:
      viewerProfile ??
      (viewerIdentity
        ? {
            identity: viewerIdentity,
          }
        : null),
    candidate,
  });
};

// ---------------------------------------------------------------------------
// Database lookup
// ---------------------------------------------------------------------------

export const getCompatibilityScore = async ({
  userAId,
  userBId,
  trx = null,
}) => {
  return compatibilityScoreDb.findByUserPair({
    userAId,
    userBId,
    trx,
  });
};

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

export const meetsMinimumThreshold = (score, minThreshold = 50) => {
  return score >= minThreshold;
};

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const getCompatibilityCategory = (score) => {
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 35) return "LOW";

  return "POOR";
};

export default {
  calculateCompatibilityBreakdown,
  calculateAndUpsertCompatibilityScore,
  calculateCompatibilityScore,
  getCompatibilityScore,
  meetsMinimumThreshold,
  getCompatibilityCategory,
};
