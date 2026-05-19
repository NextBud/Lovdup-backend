import { NotFoundException } from "../../lib/classes/errorClasses.js";
import * as matchPreferenceDb from "../../user/matchPreference.db.js";

export const getMyMatchPreference = async (userId, trx = null) => {
  return matchPreferenceDb.findByUserId(userId, trx);
};

export const upsertMyMatchPreference = async (userId, payload, trx = null) => {
  return matchPreferenceDb.upsertByUserId(userId, payload, trx);
};

export const deleteMyMatchPreference = async (userId, trx = null) => {
  const existing = await matchPreferenceDb.findByUserId(userId, trx);

  if (!existing) {
    throw new NotFoundException("Match preferences not found");
  }

  return matchPreferenceDb.deleteByUserId(userId, trx);
};
