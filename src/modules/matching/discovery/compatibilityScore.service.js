import * as compatibilityScoreDb from "./compatibilityScore.db.js";

/**
 * Sort two user IDs so the pair is always stored in the same direction
 * regardless of who triggered the calculation.
 */
export const normalizePair = (userOneId, userTwoId) => {
  return [userOneId, userTwoId].sort();
};

// ---------------------------------------------------------------------------
// Score weights — must sum to 100
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

/**
 * Parse "18-35" style age-range strings produced by older clients that
 * stored ageRange as a string. Safe to remove once all preferences are
 * migrated to ageMin / ageMax integer columns.
 */
const parseAgeRange = (ageMin, ageMax) => {
  return { min: ageMin ?? 18, max: ageMax ?? 99 };
};

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

// ---------------------------------------------------------------------------
// Identity score  (0 – 30)
// ---------------------------------------------------------------------------
const scoreIdentity = (preference, identity, reasons) => {
  if (!identity) return 0;

  let score = 0;

  // Gender match — hard gate for most users, worth the most points
  if (
    preference.preferredGenders?.length > 0 &&
    preference.preferredGenders.includes(identity.gender)
  ) {
    score += 20;
    reasons.matched.push("Gender preference matched");
  } else if (preference.preferredGenders?.length > 0) {
    reasons.missed.push("Gender outside preference");
    // Gender mismatch is disqualifying — caller filters by gender at DB
    // level, so this branch is a safety net only.
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
// Values score  (0 – 30)
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
// Lifestyle score  (0 – 25)
// ---------------------------------------------------------------------------
const scoreLifestyle = (preference, lifestyle, reasons) => {
  if (!lifestyle) return 0;

  let score = 0;

  // lifestylePreference encodes the viewer's tolerance for drinking/smoking.
  // Values: "Sober only" | "Social drinker ok" | "Any" etc.
  // We do a direct match for now; extend to a tolerance matrix as needed.
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

  // Relocation openness — if viewer needs relocation willingness, check it
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
// Location score  (0 – 15)
// ---------------------------------------------------------------------------
const scoreLocation = (preference, identity, reasons) => {
  if (!identity) return 0;

  const pref = preference.locationPreference;

  // "Anywhere" — location is irrelevant, award full points
  if (!pref || pref === "Anywhere") {
    reasons.matched.push("Location: open to anywhere");
    return WEIGHTS.location;
  }

  // We don't have the viewer's own city here — that would require a second
  // DB lookup. Instead we award points based on whether the preference
  // type is satisfied:
  //   "Same city"    → only full points if city data exists (proxy: has city)
  //   "Same country" → partial points
  // The caller (discovery.service.js) can enhance this with viewer profile
  // data if needed.

  if (pref === "Same city" && identity.residenceCity) {
    score += 15;
    reasons.matched.push("Candidate has city data for same-city preference");
    return 15;
  }

  if (pref === "Same country" && identity.residenceCountry) {
    reasons.matched.push("Candidate has country data");
    return 10;
  }

  return 5; // Has some location data
};

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

const calculateCompatibilityBreakdown = (viewerPreference, candidate) => {
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
  const locationScore = scoreLocation(viewerPreference, identity, reasons);

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

export const calculateAndUpsertCompatibilityScore = async ({
  viewerId,
  candidate,
  viewerPreference,
  trx = null,
}) => {
  const [userAId, userBId] = normalizePair(viewerId, candidate.id);

  const breakdown = calculateCompatibilityBreakdown(
    viewerPreference,
    candidate,
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
