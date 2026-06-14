import prisma from "../../config/prisma.js";

const dbClient = (tx) => tx || prisma;

// ---------------------------------------------------------------------------
// Profile shell
// ---------------------------------------------------------------------------

export const findProfileByUserId = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.profile.findUnique({
    where: { userId },
    include: {
      identity:  true,
      lifestyle: true,
      values:    true,
      narrative: true,
      profilePhotos: {
        where: { status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
      },
      voiceAnswers: {
        where: { status: "ACTIVE" },
        include: { voicePrompt: true },
      },
    },
  });
};

export const findProfileById = async (profileId, tx = null) => {
  const db = dbClient(tx);

  return db.profile.findUnique({
    where: { id: profileId },
    include: {
      identity:  true,
      lifestyle: true,
      values:    true,
      narrative: true,
    },
  });
};

/**
 * Create the Profile shell row for a user.
 * Sub-relations are written separately via their own upsert functions below.
 */
export const createProfileShell = async (userId, tx = null) => {
  const db = dbClient(tx);

  return db.profile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
};

/**
 * Update top-level profile metadata (completionPercent, onboardingCompleted,
 * processing statuses etc). Does not touch sub-relations.
 */
export const updateProfileMeta = async (userId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profile.update({
    where: { userId },
    data,
  });
};

// ---------------------------------------------------------------------------
// ProfileIdentity
// ---------------------------------------------------------------------------

export const upsertProfileIdentity = async (profileId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profileIdentity.upsert({
    where: { profileId },
    update: data,
    create: { profileId, ...data },
  });
};

// ---------------------------------------------------------------------------
// ProfileLifestyle
// ---------------------------------------------------------------------------

export const upsertProfileLifestyle = async (profileId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profileLifestyle.upsert({
    where: { profileId },
    update: data,
    create: { profileId, ...data },
  });
};

// ---------------------------------------------------------------------------
// ProfileValues
// ---------------------------------------------------------------------------

export const upsertProfileValues = async (profileId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profileValues.upsert({
    where: { profileId },
    update: data,
    create: { profileId, ...data },
  });
};

// ---------------------------------------------------------------------------
// ProfileNarrative
// ---------------------------------------------------------------------------

export const upsertProfileNarrative = async (profileId, data, tx = null) => {
  const db = dbClient(tx);

  return db.profileNarrative.upsert({
    where: { profileId },
    update: data,
    create: { profileId, ...data },
  });
};

// ---------------------------------------------------------------------------
// Completion percent helper
// Counts how many of the four sections are present and returns 0–100.
// Called after any section write to keep completionPercent current.
// ---------------------------------------------------------------------------

export const recalculateCompletionPercent = async (profileId, tx = null) => {
  const db = dbClient(tx);

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      identity:  { select: { id: true } },
      lifestyle: { select: { id: true } },
      values:    { select: { id: true } },
      narrative: { select: { id: true } },
      profilePhotos: {
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
      voiceAnswers: {
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!profile) return 0;

  // Each section is worth 15%, photos 20%, voice 20%
  const weights = {
    identity:     15,
    lifestyle:    15,
    values:       15,
    narrative:    15,
    photos:       20,
    voice:        20,
  };

  const percent =
    (profile.identity    ? weights.identity    : 0) +
    (profile.lifestyle   ? weights.lifestyle   : 0) +
    (profile.values      ? weights.values      : 0) +
    (profile.narrative   ? weights.narrative   : 0) +
    (profile.profilePhotos?.length ? weights.photos : 0) +
    (profile.voiceAnswers?.length  ? weights.voice  : 0);

  await db.profile.update({
    where: { id: profileId },
    data: {
      completionPercent: percent,
      onboardingCompleted: percent === 100,
      completedAt: percent === 100 ? new Date() : null,
    },
  });

  return percent;
};