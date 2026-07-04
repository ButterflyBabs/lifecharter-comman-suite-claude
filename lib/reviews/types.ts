export type ReviewQuestion = {
  key: string;
  label: string;
  type: "text" | "outcome_list" | "decision_list" | "blocker_list" | "finding_list";
  max?: number;
};

export type ReviewOutputRules = {
  creates?: string[];
  launches_audit?: boolean;
};

export const FINDING_SEVERITIES = ["strong", "stable", "needs_attention", "at_risk"] as const;
