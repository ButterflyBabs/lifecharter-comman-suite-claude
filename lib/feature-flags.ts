// Phase 0 feature-flag strategy: static, environment-driven flags.
// One flag per major module/phase from Section 18. A flag gates route
// availability and nav visibility, not data access — RLS is the only
// security boundary (Section 11.3).
//
// Phase 1+ migration path: once the `workspaces` table exists, replace
// this with a `feature_flags` table (flag_key, workspace_id nullable for
// global default, enabled, rollout_note) so flags can be toggled per
// workspace without a redeploy. See docs/master-product-architecture.md.

export type FeatureFlag =
  | "buildMode"
  | "runMode"
  | "aiTeam"
  | "globalControl";

const ENV_MAP: Record<FeatureFlag, string> = {
  buildMode: "NEXT_PUBLIC_FF_BUILD_MODE",
  runMode: "NEXT_PUBLIC_FF_RUN_MODE",
  aiTeam: "NEXT_PUBLIC_FF_AI_TEAM",
  globalControl: "NEXT_PUBLIC_FF_GLOBAL_CONTROL",
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return process.env[ENV_MAP[flag]] === "true";
}
