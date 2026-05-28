import prisma from "../../config/prisma.js";

export const logOnboardingEvent = async ({
  userId,
  eventType,
  stepId,
  metadata = {},
}) => {
  return prisma.onboardingAuditLog.create({
    data: {
      userId,
      eventType,
      stepId,
      metadata,
    },
  });
};
