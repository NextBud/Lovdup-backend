import {
  BadRequestError,
  ForbiddenError,
  NotFoundException,
} from "../../../classes/errorClasses.js";
import * as matchDb from "./match.db.js";

// Helper function to calculate age from birthDate
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Helper to get primary photo
const getPrimaryPhoto = (photos) => {
  if (!photos || photos.length === 0) return null;
  return photos.find((photo) => photo.isPrimary) || photos[0] || null;
};

// Helper to format photos
const formatPhotos = (photos) => {
  if (!photos || photos.length === 0) return [];
  return photos
    .filter((photo) => photo.status === "ACTIVE")
    .sort((a, b) => a.position - b.position)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      publicId: photo.publicId,
      position: photo.position,
      isPrimary: photo.isPrimary,
      moderationStatus: photo.moderationStatus,
      createdAt: photo.createdAt,
    }));
};

// Helper to format voice answers
const formatVoiceAnswers = (voiceAnswers) => {
  if (!voiceAnswers || voiceAnswers.length === 0) return [];
  return voiceAnswers
    .filter((answer) => answer.status === "ACTIVE")
    .map((answer) => ({
      id: answer.id,
      url: answer.url,
      publicId: answer.publicId,
      durationSeconds: answer.durationSeconds,
      transcript: answer.transcript,
      language: answer.language,
      promptId: answer.voicePromptId,
      promptQuestion: answer.voicePrompt?.question || null,
      createdAt: answer.createdAt,
    }));
};

// Helper to format match-specific data
const formatMatchSpecificData = (match, user) => {
  const compatibilityScore = match.compatibilityScore || null;
  const matchResult = match.matchResult || null;

  return {
    compatibilityScore: compatibilityScore?.score || null,
    compatibilityDetails: compatibilityScore
      ? {
          score: compatibilityScore.score,
          identityScore: compatibilityScore.identityScore,
          lifestyleScore: compatibilityScore.lifestyleScore,
          valuesScore: compatibilityScore.valuesScore,
          locationScore: compatibilityScore.locationScore,
          reasons: compatibilityScore.reasons,
          calculatedAt: compatibilityScore.calculatedAt,
        }
      : null,
    matchResult: matchResult
      ? {
          reason: matchResult.reason,
          rank: matchResult.rank,
          score: matchResult.score,
          shownAt: matchResult.shownAt,
          actedAt: matchResult.actedAt,
          dismissed: matchResult.dismissed,
        }
      : null,
  };
};

const getOtherUserFromMatch = (match, userId) => {
  return match.userAId === userId ? match.userB : match.userA;
};

const formatMatchedUser = (user, match = null) => {
  const profile = user.profile;
  const identity = profile?.identity;
  const narrative = profile?.narrative;
  const lifestyle = profile?.lifestyle;
  const values = profile?.values;

  const primaryPhoto = getPrimaryPhoto(user.profilePhotos);
  const photos = formatPhotos(user.profilePhotos);
  const voiceAnswers = formatVoiceAnswers(user.voiceAnswers);

  // Calculate if profile is complete enough for matching
  const isProfileComplete =
    identity &&
    lifestyle &&
    values &&
    narrative &&
    user.profilePhotos?.length >= 3 && // At least 3 photos
    user.voiceAnswers?.length >= 1; // At least 1 voice answer

  const formattedUser = {
    // Basic user info
    id: user.id,
    profileId: profile?.id || null,

    // Identity fields
    identity: identity
      ? {
          firstName: identity.firstName,
          lastName: identity.lastName,
          name: `${identity.firstName} ${identity.lastName}`.trim(),
          gender: identity.gender,
          birthDate: identity.birthDate,
          age: calculateAge(identity.birthDate),
          originCountry: identity.originCountry,
          residenceCountry: identity.residenceCountry,
          residenceCity: identity.residenceCity,
          ethnicity: identity.ethnicity,
          languages: identity.languages || [],
          occupation: identity.occupation,
          relationshipIntention: identity.relationshipIntention,
          education: identity.education,
        }
      : null,

    // Narrative
    narrative: narrative
      ? {
          aboutMe: narrative.aboutMe,
        }
      : null,

    // Lifestyle
    lifestyle: lifestyle
      ? {
          drinking: lifestyle.drinking,
          smoking: lifestyle.smoking,
          socialLife: lifestyle.socialLife,
          fitnessImportance: lifestyle.fitnessImportance,
          moneyStyle: lifestyle.moneyStyle,
          relocationFeelings: lifestyle.relocationFeelings,
          financialStatus: lifestyle.financialStatus,
        }
      : null,

    // Values
    values: values
      ? {
          religion: values.religion,
          religionImportance: values.religionImportance,
          childrenPreference: values.childrenPreference,
          hasChildren: values.hasChildren,
          personalCommStyle: values.personalCommStyle,
          personalTuesdayVibe: values.personalTuesdayVibe,
        }
      : null,

    // Media
    photos: photos,
    primaryPhoto: primaryPhoto,
    voiceAnswers: voiceAnswers,

    // Profile completion
    profileCompletion: {
      percentage: profile?.completionPercent || 0,
      isComplete: profile?.onboardingCompleted || false,
      isReadyForMatching: isProfileComplete,
      hasPhotos: (user.profilePhotos?.length || 0) > 0,
      hasVoiceAnswers: (user.voiceAnswers?.length || 0) > 0,
      hasIdentity: !!identity,
      hasLifestyle: !!lifestyle,
      hasValues: !!values,
      hasNarrative: !!narrative,
    },

    // User status
    status: {
      status: user.status,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      verified: user.verified,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    },

    // Timestamps
    timestamps: {
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActiveAt: user.lastActiveAt,
      lastLoginAt: user.lastLoginAt,
    },

    // Match-specific data
    ...(match && formatMatchSpecificData(match, user)),
  };

  // Add convenience getters (flat access for backward compatibility)
  return {
    ...formattedUser,
    // Flat access for common fields (backward compatibility)
    firstName: identity?.firstName || null,
    lastName: identity?.lastName || null,
    name: identity ? `${identity.firstName} ${identity.lastName}`.trim() : null,
    gender: identity?.gender || null,
    age: calculateAge(identity?.birthDate) || null,
    occupation: identity?.occupation || null,
    city: identity?.residenceCity || null,
    country: identity?.residenceCountry || null,
    aboutMe: narrative?.aboutMe || null,
    photo: primaryPhoto?.url || null,
    photos: photos,
    voiceAnswers: voiceAnswers,
    compatibilityScore: match?.compatibilityScore?.score || null,
    matchStatus: match?.status || null,
    completionPercent: profile?.completionPercent || 0,
  };
};

const formatMatch = (match, userId) => {
  if (!match) return null;

  const otherUser = getOtherUserFromMatch(match, userId);
  const otherUserId = otherUser?.id;

  // Determine if current user initiated the match
  const isInitiator = match.userAId === userId;
  const otherUserStatus =
    match.userAId === userId ? match.userB?.status : match.userA?.status;

  // Check for block status
  const isBlocked = otherUser?.isBlocked || false;
  const hasBlockedUser = otherUser?.hasBlockedUser || false;

  // Get conversation if it exists
  const conversation = match.conversation || null;
  const lastMessage = conversation?.lastMessage || null;
  const unreadCount = conversation?.messages
    ? conversation.messages.filter(
        (msg) => !msg.readAt && msg.senderId !== userId,
      ).length
    : 0;

  return {
    id: match.id,
    status: match.status,
    matchedAt: match.matchedAt,
    unmatchedAt: match.unmatchedAt || null,
    isInitiator: isInitiator,

    // Match metadata
    metadata: {
      duration: match.matchedAt
        ? Math.floor(
            (new Date() - new Date(match.matchedAt)) / (1000 * 60 * 60 * 24),
          ) // days
        : null,
      isActive: match.status === "ACTIVE",
      isUnmatched: match.status === "UNMATCHED",
      isBlocked: match.status === "BLOCKED",
      daysSinceMatch: match.matchedAt
        ? Math.floor(
            (new Date() - new Date(match.matchedAt)) / (1000 * 60 * 60 * 24),
          )
        : null,
    },

    // User data
    user: otherUser ? formatMatchedUser(otherUser, match) : null,

    // Conversation data
    conversation: conversation
      ? {
          id: conversation.id,
          stage: conversation.stage,
          status: conversation.status,
          lastActivityAt: conversation.lastActivityAt,
          lastMessageAt: conversation.lastMessageAt,
          contactRevealed: conversation.contactRevealed,
          contactRevealedAt: conversation.contactRevealedAt,
          stageProgress: {
            userAStage2: conversation.userAStage2,
            userBStage2: conversation.userBStage2,
            userAStage3: conversation.userAStage3,
            userBStage3: conversation.userBStage3,
            userAStage4: conversation.userAStage4,
            userBStage4: conversation.userBStage4,
            currentStageUnlocked: conversation.stage,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                type: lastMessage.type,
                body: lastMessage.body,
                voiceUrl: lastMessage.voiceUrl,
                voiceDuration: lastMessage.voiceDuration,
                photoUrl: lastMessage.photoUrl,
                createdAt: lastMessage.createdAt,
                readAt: lastMessage.readAt,
                isRead: !!lastMessage.readAt,
                isMine: lastMessage.senderId === userId,
              }
            : null,
          unreadCount: unreadCount,
          messages: conversation.messages?.slice(-5) || [], // Last 5 messages
        }
      : null,

    // Block status
    blockInfo: {
      isBlocked: isBlocked,
      hasBlockedUser: hasBlockedUser,
      canInteract: !isBlocked && !hasBlockedUser && match.status === "ACTIVE",
    },

    // User status check
    userStatus: {
      otherUserStatus: otherUserStatus,
      isOtherUserActive: otherUserStatus === "ACTIVE" && otherUser?.isActive,
      isOtherUserSuspended: otherUser?.isSuspended || false,
    },

    // Compatibility
    compatibility: match.compatibilityScore
      ? {
          score: match.compatibilityScore.score,
          levels: {
            identity: match.compatibilityScore.identityScore,
            lifestyle: match.compatibilityScore.lifestyleScore,
            values: match.compatibilityScore.valuesScore,
            location: match.compatibilityScore.locationScore,
          },
          reasons: match.compatibilityScore.reasons,
          calculatedAt: match.compatibilityScore.calculatedAt,
        }
      : null,

    // Match result (for discovery matches)
    matchResult: match.matchResult
      ? {
          reason: match.matchResult.reason,
          rank: match.matchResult.rank,
          score: match.matchResult.score,
          shownAt: match.matchResult.shownAt,
          actedAt: match.matchResult.actedAt,
          dismissed: match.matchResult.dismissed,
        }
      : null,
  };
};

export const getMyMatches = async (userId, filters = {}, trx = null) => {
  const { status = "ACTIVE", limit = 50, offset = 0 } = filters;

  const matches = await matchDb.findUserMatches({
    userId,
    status,
    limit,
    offset,
    trx,
  });

  if (!matches || matches.length === 0) {
    return {
      matches: [],
      total: 0,
      hasMore: false,
    };
  }

  const formattedMatches = matches.map((match) => formatMatch(match, userId));

  // Sort matches by most recent activity or match date
  const sortedMatches = formattedMatches.sort((a, b) => {
    const aDate = a.conversation?.lastActivityAt || a.matchedAt;
    const bDate = b.conversation?.lastActivityAt || b.matchedAt;
    return new Date(bDate) - new Date(aDate);
  });

  return {
    matches: sortedMatches,
    total: matches.length,
    hasMore: matches.length === limit,
  };
};

export const getMatchDetails = async ({ userId, matchId, trx = null }) => {
  const match = await matchDb.findById(matchId, trx);

  if (!match) {
    throw new NotFoundException("Match not found");
  }

  const isParticipant = match.userAId === userId || match.userBId === userId;

  if (!isParticipant) {
    throw new ForbiddenError("You do not have access to this match");
  }

  return formatMatch(match, userId);
};

// match.service.js - Update unmatch function
export const unmatch = async ({ userId, matchId, reason = null, trx = null }) => {
  // Validate match exists
  const match = await matchDb.findById(matchId, trx);
  if (!match) {
    throw new NotFoundException("Match not found");
  }

  // Verify user is part of the match
  const isParticipant = match.userAId === userId || match.userBId === userId;
  if (!isParticipant) {
    throw new ForbiddenError("You cannot unmatch this match");
  }

  // Check if match can be unmatched
  if (match.status !== "ACTIVE") {
    throw new BadRequestError(
      `This match is not active (current status: ${match.status})`
    );
  }

  // Get the other user for potential future use
  const otherUser = getOtherUserFromMatch(match, userId);
  const otherUserId = otherUser?.id;

  // Update match status with new fields
  const updatedMatch = await matchDb.updateMatchStatus({
    matchId,
    status: "UNMATCHED",
    unmatchedAt: new Date(),
    unmatchedBy: userId,       
    unmatchedReason: reason,
    trx,
  });

  // Return formatted response with unmatch details
  return {
    success: true,
    matchId: matchId,
    status: "UNMATCHED",
    unmatchedAt: new Date(),
    unmatchedBy: userId,
    reason: reason,
    otherUserId: otherUserId,
    message: "Successfully unmatched",
  };
};


export const blockMatch = async ({
  userId,
  matchId,
  reason = null,
  trx = null,
}) => {
  // Validate match exists
  const match = await matchDb.findById(matchId, trx);
  if (!match) {
    throw new NotFoundException("Match not found");
  }

  // Verify user is part of the match
  const isParticipant = match.userAId === userId || match.userBId === userId;
  if (!isParticipant) {
    throw new ForbiddenError("You cannot block this match");
  }

  // Check if match is active
  if (match.status !== "ACTIVE") {
    throw new BadRequestError(
      `This match is not active (current status: ${match.status})`,
    );
  }

  // Get other user for blocking
  const otherUser = getOtherUserFromMatch(match, userId);
  const otherUserId = otherUser?.id;

  // Create block record
  const block = await matchDb.createBlock({
    blockerId: userId,
    blockedId: otherUserId,
    reason: reason,
    trx,
  });

  // Update match status
  const updatedMatch = await matchDb.updateMatchStatus({
    matchId,
    status: "BLOCKED",
    unmatchedAt: new Date(),
    unmatchedBy: userId,
    unmatchedReason: reason || "Blocked",
    trx,
  });

  return {
    success: true,
    matchId: matchId,
    status: "BLOCKED",
    blockId: block.id,
    blockedAt: new Date(),
    blockedUserId: otherUserId,
    reason: reason,
    message: "Successfully blocked match",
  };
};

export const getMatchStats = async (userId, trx = null) => {
  const stats = await matchDb.getUserMatchStats(userId, trx);

  return {
    total: stats.total || 0,
    active: stats.active || 0,
    unmatched: stats.unmatched || 0,
    blocked: stats.blocked || 0,
    matchesThisMonth: stats.matchesThisMonth || 0,
    matchesThisWeek: stats.matchesThisWeek || 0,
    averageMatchDuration: stats.averageDuration || null,
  };
};

// Export all functions
export default {
  getMyMatches,
  getMatchDetails,
  unmatch,
  blockMatch,
  getMatchStats,
};
