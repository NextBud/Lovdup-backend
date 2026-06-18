import * as compatibilityScoreDb from "./compatibilityScore.db.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sort two user IDs so the pair is always stored in the same direction
 * regardless of who triggered the calculation.
 */
export const normalizePair = (userOneId, userTwoId) => {
  return [userOneId, userTwoId].sort();
};

/**
 * Calculate age from birth date
 */
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

/**
 * Parse age range from min/max values
 */
const parseAgeRange = (ageMin, ageMax) => {
  return { min: ageMin ?? 18, max: ageMax ?? 99 };
};

// ---------------------------------------------------------------------------
// Score Weights — must sum to 100
// ---------------------------------------------------------------------------
//
//  Identity  (gender + age range)          0 – 30
//  Values    (religion, children, intent)  0 – 30
//  Lifestyle (drinking, smoking, social,
//             fitness, money, relocation)  0 – 25
//  Location  (city / country / anywhere)   0 – 15
//
// A candidate needs to clear the viewer's minCompatibilityScore (default 50)
// before they're shown. For an 80% threshold a candidate must match well
// across at least three of the four categories.
// ---------------------------------------------------------------------------

const WEIGHTS = {
  identity: 30,
  values: 30,
  lifestyle: 25,
  location: 15,
};

// ---------------------------------------------------------------------------
// Identity Score  (0 – 30)
// ---------------------------------------------------------------------------

const scoreIdentity = (preference, identity, reasons) => {
  if (!identity) return 0;

  let score = 0;

  // Gender match — hard gate, worth the most points
  if (
    preference.preferredGenders?.length > 0 &&
    preference.preferredGenders.includes(identity.gender)
  ) {
    score += 20;
    reasons.matched.push("Gender preference matched");
  } else if (preference.preferredGenders?.length > 0) {
    reasons.missed.push("Gender outside preference");
    // Gender mismatch is disqualifying — caller filters by gender at DB level
    return 0;
  }

  // Age range match
  const candidateAge = calculateAge(identity.birthDate);
  const { min, max } = parseAgeRange(preference.ageMin, preference.ageMax);

  if (candidateAge !== null) {
    if (candidateAge >= min && candidateAge <= max) {
      score += 10;
      reasons.matched.push(`Age ${candidateAge} within ${min}–${max}`);
    } else {
      reasons.missed.push(`Age ${candidateAge} outside ${min}–${max}`);
    }
  }

  return Math.min(score, WEIGHTS.identity);
};

// ---------------------------------------------------------------------------
// Values Score  (0 – 30)
// ---------------------------------------------------------------------------

const scoreValues = (preference, values, reasons) => {
  if (!values) return 0;

  let score = 0;

  // Religion
  if (
    preference.religionPreference &&
    preference.religionPreference !== "Open to all"
  ) {
    if (values.religion === preference.religionPreference) {
      score += 12;
      reasons.matched.push("Religion matched");
    } else {
      reasons.missed.push("Religion outside preference");
    }
  } else {
    // Open to all — award partial credit for having any religion info
    score += 6;
    reasons.matched.push("Open to all religions");
  }

  // Children preference
  if (preference.childrenPreference) {
    if (values.childrenPreference === preference.childrenPreference) {
      score += 10;
      reasons.matched.push("Children preference matched");
    } else {
      reasons.missed.push("Children preference mismatch");
    }
  }

  // Communication style
  if (preference.communicationStyle) {
    if (values.personalCommStyle === preference.communicationStyle) {
      score += 4;
      reasons.matched.push("Communication style matched");
    } else {
      reasons.missed.push("Communication style differs");
    }
  }

  // Tuesday vibe
  if (preference.tuesdayFeeling) {
    if (values.personalTuesdayVibe === preference.tuesdayFeeling) {
      score += 4;
      reasons.matched.push("Tuesday feeling matched");
    }
  }

  return Math.min(score, WEIGHTS.values);
};

// ---------------------------------------------------------------------------
// Lifestyle Score  (0 – 25)
// ---------------------------------------------------------------------------

const scoreLifestyle = (preference, lifestyle, reasons) => {
  if (!lifestyle) return 0;

  let score = 0;

  // Lifestyle tolerance match (drinking/smoking)
  if (preference.lifestylePreference) {
    const toleranceMatch = (() => {
      const pref = preference.lifestylePreference.toLowerCase();
      if (pref === "any") return true;
      if (
        pref.includes("sober") &&
        lifestyle.drinking === "Never" &&
        lifestyle.smoking === "Never"
      )
        return true;
      if (
        pref.includes("social") &&
        lifestyle.drinking !== "Regularly" &&
        lifestyle.smoking === "Never"
      )
        return true;
      return false;
    })();

    if (toleranceMatch) {
      score += 10;
      reasons.matched.push("Lifestyle habits compatible");
    } else {
      reasons.missed.push("Lifestyle habits differ");
    }
  }

  // Social level
  if (preference.socialLevel) {
    if (lifestyle.socialLife === preference.socialLevel) {
      score += 5;
      reasons.matched.push("Social level matched");
    }
  }

  // Financial stage
  if (preference.financialStagePreference) {
    if (lifestyle.financialStatus === preference.financialStagePreference) {
      score += 5;
      reasons.matched.push("Financial stage matched");
    }
  }

  // Relocation openness
  if (preference.locationPreference === "Anywhere") {
    if (
      lifestyle.relocationFeelings === "Yes" ||
      lifestyle.relocationFeelings === "Maybe"
    ) {
      score += 5;
      reasons.matched.push("Open to relocation");
    } else {
      reasons.missed.push("Not open to relocation");
    }
  } else {
    score += 5; // Not requiring relocation — no penalty
  }

  return Math.min(score, WEIGHTS.lifestyle);
};

// ---------------------------------------------------------------------------
// Location Score  (0 – 15)
// ---------------------------------------------------------------------------

// compatibilityScore.service.js - Update scoreLocation
const scoreLocation = (preference, identity, viewerIdentity, reasons) => {
  if (!identity) return 0;

  const pref = preference.locationPreference;

  if (!pref || pref === "Anywhere") {
    reasons.matched.push("Location: open to anywhere");
    return WEIGHTS.location;
  }

  // If we don't have viewer identity, give partial credit based on candidate data
  if (!viewerIdentity) {
    if (pref === "Same city" && identity.residenceCity) {
      reasons.matched.push("Candidate has city data (viewer unknown)");
      return 8;
    }
    if (pref === "Same country" && identity.residenceCountry) {
      reasons.matched.push("Candidate has country data (viewer unknown)");
      return 6;
    }
    return 5;
  }

  // Same city comparison
  if (pref === "Same city") {
    if (identity.residenceCity && viewerIdentity.residenceCity) {
      if (identity.residenceCity === viewerIdentity.residenceCity) {
        reasons.matched.push("Same city");
        return WEIGHTS.location;
      } else {
        reasons.missed.push("Different city");
        return 5;
      }
    }
    if (identity.residenceCity) {
      reasons.matched.push("Candidate has city data");
      return 10;
    }
    return 5;
  }

  // Same country comparison
  if (pref === "Same country") {
    if (identity.residenceCountry && viewerIdentity.residenceCountry) {
      if (identity.residenceCountry === viewerIdentity.residenceCountry) {
        reasons.matched.push("Same country");
        return 12;
      } else {
        reasons.missed.push("Different country");
        return 5;
      }
    }
    if (identity.residenceCountry) {
      reasons.matched.push("Candidate has country data");
      return 8;
    }
    return 5;
  }

  return 5;
};

// ---------------------------------------------------------------------------
// Main Calculation
// ---------------------------------------------------------------------------

const calculateCompatibilityBreakdown = (
  viewerPreference,
  candidate,
  viewerIdentity,
) => {
  const profile = candidate.profile;

  if (!profile) {
    return {
      score: 0,
      identityScore: 0,
      lifestyleScore: 0,
      valuesScore: 0,
      locationScore: 0,
      reasons: { matched: [], missed: ["Candidate has no profile"] },
    };
  }

  const { identity, lifestyle, values } = profile;
  const reasons = { matched: [], missed: [] };

  const identityScore = scoreIdentity(viewerPreference, identity, reasons);
  const valuesScore = scoreValues(viewerPreference, values, reasons);
  const lifestyleScore = scoreLifestyle(viewerPreference, lifestyle, reasons);
  const locationScore = scoreLocation(
    viewerPreference,
    identity,
    viewerIdentity,
    reasons,
  );

  // Hard cap at 98 — a perfect stranger cannot be a 100% match
  const score = Math.min(
    identityScore + valuesScore + lifestyleScore + locationScore,
    98,
  );

  return {
    score,
    identityScore,
    lifestyleScore,
    valuesScore,
    locationScore,
    reasons,
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate compatibility score between a viewer and a candidate,
 * then upsert the result to the database.
 */
export const calculateAndUpsertCompatibilityScore = async ({
  viewerId,
  candidate,
  viewerPreference,
  viewerIdentity = null, // Pass viewer's identity for location matching
  trx = null,
}) => {
  const [userAId, userBId] = normalizePair(viewerId, candidate.id);

  const breakdown = calculateCompatibilityBreakdown(
    viewerPreference,
    candidate,
    viewerIdentity,
  );

  return compatibilityScoreDb.upsertByUserPair(
    {
      userAId,
      userBId,
      score: breakdown.score,
      identityScore: breakdown.identityScore,
      lifestyleScore: breakdown.lifestyleScore,
      valuesScore: breakdown.valuesScore,
      locationScore: breakdown.locationScore,
      reasons: breakdown.reasons,
    },
    trx,
  );
};

/**
 * Calculate compatibility score between two users without persisting
 * (useful for real-time matching or previews).
 */
export const calculateCompatibilityScore = ({
  viewerPreference,
  candidate,
  viewerIdentity = null,
}) => {
  return calculateCompatibilityBreakdown(
    viewerPreference,
    candidate,
    viewerIdentity,
  );
};

/**
 * Get compatibility score between two users from the database.
 */
export const getCompatibilityScore = async ({
  userAId,
  userBId,
  trx = null,
}) => {
  const [idA, idB] = normalizePair(userAId, userBId);
  return compatibilityScoreDb.findByUserPair({
    userAId: idA,
    userBId: idB,
    trx,
  });
};

/**
 * Check if a candidate meets the minimum compatibility threshold.
 */
export const meetsMinimumThreshold = (score, minThreshold = 50) => {
  return score >= minThreshold;
};

/**
 * Get compatibility category based on score.
 */
export const getCompatibilityCategory = (score) => {
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 35) return "LOW";
  return "POOR";
};

export default {
  normalizePair,
  calculateAndUpsertCompatibilityScore,
  calculateCompatibilityScore,
  getCompatibilityScore,
  meetsMinimumThreshold,
  getCompatibilityCategory,
};
