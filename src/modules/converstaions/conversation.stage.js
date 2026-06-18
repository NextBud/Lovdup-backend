export const STAGE_LABELS = {
  1: "Text Chat",
  2: "Voice Messages",
  3: "Photo Sharing",
  4: "Contact Reveal",
};

export const getStageLabel = (stage) => STAGE_LABELS[stage] ?? `Stage ${stage}`;