-- strategy_profiles and business_models are "versioned direction" records per
-- Section 6 (a version counter that increments on revision), the same pattern
-- as founder_profiles and brand_profiles — one evolving row per workspace, not
-- parallel historical rows. Those two already got unique(workspace_id) in
-- their original migrations; this closes the same gap here.
alter table public.strategy_profiles add constraint strategy_profiles_workspace_id_key unique (workspace_id);
alter table public.business_models add constraint business_models_workspace_id_key unique (workspace_id);
