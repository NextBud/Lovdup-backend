import * as compatibilityScoreDb from "./compatibilityScore.db.js";

export const normalizePair = (userOneId, userTwoId) => {
  return [userOneId, userTwoId].sort();
};

const calculateCompatibilityBreakdown = (viewerPreference, candidate) => {
  const profile = candidate.profile;

  if (!profile) {
    return {
      score: 0,
      profileScore: 0,
      lifestyleScore: 0,
      valuesScore: 0,
      locationScore: 0,
      reasons: {
        failed: ["Candidate has no profile"],
      },
    };
  }

  let profileScore = 40;
  let lifestyleScore = 10;
  let valuesScore = 10;
  let locationScore = 0;

  const reasons = {
    matched: [],
    missed: [],
  };

  if (
    viewerPreference.preferredGenders?.length &&
    viewerPreference.preferredGenders.includes(profile.gender)
  ) {
    profileScore += 10;
    reasons.matched.push("Gender preference matched");
  }

  if (
    viewerPreference.religionPreference &&
    viewerPreference.religionPreference !== "Open to all" &&
    profile.religion
  ) {
    valuesScore += 5;
    reasons.matched.push("Religion signal available");
  }

  if (
    viewerPreference.childrenPreference &&
    profile.childrenPreference === viewerPreference.childrenPreference
  ) {
    valuesScore += 5;
    reasons.matched.push("Children preference matched");
  }

  if (
    viewerPreference.communicationStyle &&
    profile.personalCommStyle === viewerPreference.communicationStyle
  ) {
    lifestyleScore += 5;
    reasons.matched.push("Communication style matched");
  }

  if (
    viewerPreference.tuesdayFeeling &&
    profile.personalTuesdayVibe === viewerPreference.tuesdayFeeling
  ) {
    lifestyleScore += 5;
    reasons.matched.push("Tuesday feeling matched");
  }

  if (
    viewerPreference.locationPreference === "Same city" &&
    profile.residenceCity
  ) {
    locationScore += 5;
    reasons.matched.push("Location preference considered");
  }

  const score = Math.min(
    profileScore + lifestyleScore + valuesScore + locationScore,
    98,
  );

  return {
    score,
    profileScore,
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

  const compatibilityScore = await compatibilityScoreDb.upsertByUserPair(
    {
      userAId,
      userBId,
      ...breakdown,
    },
    trx,
  );

  return compatibilityScore;
};
