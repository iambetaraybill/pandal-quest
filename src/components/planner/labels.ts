import type { CrowdLevel, CrowdTolerance, Group, Interest } from "@/lib/types";

export const GROUP_LABEL: Record<Group, string> = {
  solo: "Solo",
  friends: "Friends",
  family: "Family",
  elders: "With elders",
  kids: "With kids",
};

export const INTEREST_LABEL: Record<Interest, string> = {
  heritage: "Heritage",
  bonedi: "Bonedi bari",
  traditional: "Traditional",
  theme: "Theme",
  art: "Art",
  famous: "Famous",
  quiet: "Quiet",
};

export const TOLERANCE_LABEL: Record<CrowdTolerance, string> = {
  low: "Avoid queues",
  medium: "Some queueing",
  high: "Crowds are fine",
};

export const CROWD_TONE: Record<CrowdLevel, string> = {
  calm: "bg-grass/15 text-[color-mix(in_oklch,var(--grass),black_25%)]",
  moderate: "bg-marigold/25 text-[color-mix(in_oklch,var(--marigold),black_55%)]",
  busy: "bg-sindoor/12 text-sindoor",
  packed: "bg-sindoor text-primary-foreground",
};

export const KIND_LABEL = { pandal: "Sarbojanin", bonedi: "Bonedi bari", landmark: "Walk" } as const;
