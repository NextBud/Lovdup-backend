import {
  BadRequestError,
  ForbiddenError,
  NotFoundException,
} from "../../../classes/errorClasses.js";
import * as matchDb from "./match.db.js";

const getOtherUserFromMatch = (match, userId) => {
  return match.userAId === userId ? match.userB : match.userA;
};

const formatMatchedUser = (user) => {
  const profile = user.profile;
  const primaryPhoto = user.profilePhotos?.[0] || null;

  return {
    id: user.id,
    profileId: profile?.id || null,

    firstName: profile?.firstName || null,
    lastName: profile?.lastName || null,
    name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : null,

    photo: primaryPhoto?.url || null,
    photos: user.profilePhotos || [],

    occupation: profile?.occupation || null,
    city: profile?.residenceCity || null,
    country: profile?.residenceCountry || null,
    aboutMe: profile?.aboutMe || null,
  };
};

const formatMatch = (match, userId) => {
  const otherUser = getOtherUserFromMatch(match, userId);

  return {
    id: match.id,
    status: match.status,
    matchedAt: match.matchedAt,
    unmatchedAt: match.unmatchedAt || null,

    user: formatMatchedUser(otherUser),
  };
};

export const getMyMatches = async (userId, trx = null) => {
  const matches = await matchDb.findUserMatches({ userId, trx });

  return matches.map((match) => formatMatch(match, userId));
};

export const unmatch = async ({ userId, matchId, trx = null }) => {
  const match = await matchDb.findById(matchId, trx);

  if (!match) {
    throw new NotFoundException("Match not found");
  }

  const isParticipant = match.userAId === userId || match.userBId === userId;

  if (!isParticipant) {
    throw new ForbiddenError("You cannot unmatch this match");
  }

  if (match.status !== "ACTIVE") {
    throw new BadRequestError("This match is not active");
  }

  return matchDb.updateMatchStatus({
    matchId,
    status: "UNMATCHED",
    unmatchedAt: new Date(),
    trx,
  });
};
