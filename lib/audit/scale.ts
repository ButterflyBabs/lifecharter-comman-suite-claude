// Canonical Business Command Audit v1 response scale (kept separate from question
// wording, per the bank's databaseRequirements). The 0–4 ordinal scores are
// normalized to 0–100 on save (raw × 25) so the deterministic scoring pipeline
// (audit_domain_scores view, roadmap generation, findings) stays unchanged.

export type ScaleOption = { value: number; label: string };
export type UnscoredOption = { key: string; label: string; hint: string };

export const SCALE_0_4_OPTIONS: ScaleOption[] = [
  { value: 0, label: "Not in place" },
  { value: 1, label: "Informal or just beginning" },
  { value: 2, label: "Partially defined or inconsistently used" },
  { value: 3, label: "Documented, implemented, and usually followed" },
  { value: 4, label: "Fully implemented, measured, and regularly maintained" },
];

export const UNSCORED_OPTIONS: UnscoredOption[] = [
  { key: "not_sure", label: "Not Sure", hint: "We'll ask a quick follow-up to clarify." },
  { key: "not_applicable", label: "Not Applicable", hint: "Add a short note explaining why." },
];

// Raw 0–4 → normalized 0–100 for the score column.
export function normalizeScale0to4(raw: number): number {
  return Math.round((raw / 4) * 100);
}
