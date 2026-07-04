# Data Model

Canonical database object model for the LifeCharter Command Suite, transcribed from
Section 10 of the Master Product Restructure Specification. This document is the
source of truth for schema design; no table should be created that isn't listed here
(or a documented, approved addition to it).

**Status as of Phase 8 (subset A): the full Section 18 build order (Phases 0-7) is
complete, plus a prioritized first slice of Phase 8, the Knowledge and Asset
Library + Search, the entire Settings section (Appendix A), and the template
marketplace (the first item of Phase 8's deferred remainder).** Every
canonical route in the app is now built. 177 tables are live in
`itxfgxmdyqpcytmgdysa`, all with Row Level Security enabled and zero new
security-advisor findings beyond one expected, by-design INFO finding (see
Phase 8 assumptions below). Phases 0-7 built the complete canonical object model
— 10.3 through 10.9 in full. Phase 8 is Section 18's ninth stage,
"Productization, scale, and ecosystem expansion" — the initial pass added
subscription billing/entitlements, usage limits, and data export/deletion,
deferring template marketplace, white-label workspaces, cross-tenant
benchmarking, mobile/voice refinements, and multi-brand enhancements to
explicit future requests; the marketplace has since been built (see the Phase
8 assumptions section and the template marketplace assumptions section below).
White-label workspaces, cross-tenant benchmarking, mobile/voice refinements,
and multi-brand enhancements remain deferred. Migrations live in `supabase/migrations/`,
applied via the Supabase MCP connector and tracked in Supabase's own migration
history (`list_migrations`). See
[migration-and-deployment.md](migration-and-deployment.md) for full detail.

Built in Phase 1 (26 tables — 10.3 + 10.9 subset + 10.4 work-engine subset):
`workspaces`, `business_units`, `user_profiles`, `workspace_members`, `roles`,
`permissions`, `role_permissions`, `member_roles`, `audit_events`, `activity_events`,
`tasks`, `task_dependencies`, `outcomes`, `decisions`, `approvals`, `blockers`,
`comments`, `notifications`, `notification_preferences`, `assets`, `asset_versions`,
`folders`, `tags`, `asset_tags`, `templates`, `template_versions`.

Built in Phase 2 (19 tables — the rest of 10.4, plus the 10.9 review objects):
`business_command_domains`, `audit_templates`, `audit_questions`, `audit_instances`,
`audit_responses`, `audit_findings` (plus the `audit_domain_scores` view),
`roadmap_templates`, `roadmap_instances`, `roadmap_phases`, `roadmap_milestones`,
`milestone_dependencies`, `stage_gates`, `gate_requirements`, `completion_evidence`,
`review_templates`, `review_instances`, `review_responses`, `review_findings`.

Built in Phase 3 (19 tables — the full 10.5 Business Architecture set):
`founder_profiles`, `decision_principles`, `strategy_profiles`, `goals`,
`key_results`, `business_models`, `market_segments`, `ideal_profiles`,
`positioning_profiles`, `brand_profiles`, `message_pillars`, `claim_rules`,
`proof_items`, `offers`, `offer_versions`, `offer_deliverables`, `offer_pricing`,
`offer_capacity_models`, `offer_economics`.

Built in Phase 4 (32 tables — the full 10.6 Revenue Engine set):
`people`, `organizations`, `relationship_roles`, `relationship_links`,
`lead_sources`, `leads`, `research_projects`, `research_findings`, `lead_scores`,
`campaigns`, `campaign_members`, `content_assets`, `nurture_sequences`,
`nurture_steps`, `interactions`, `outreach_messages`, `pipeline_definitions`,
`pipeline_stages`, `opportunities`, `opportunity_stakeholders`, `stage_history`,
`discovery_sessions`, `proposals`, `proposal_versions`, `contracts`,
`contract_versions`, `orders`, `invoices`, `payments`, `refunds`,
`revenue_forecasts`, `forecast_lines`.

Built in Phase 5 (30 tables — the full 10.7 Client Experience set):
`clients`, `client_contacts`, `client_offer_enrollments`, `client_portal_access`,
`journey_templates`, `journey_stages`, `journey_touchpoints`, `onboarding_templates`,
`onboarding_instances`, `onboarding_items`, `programs`, `program_versions`,
`program_phases`, `sessions`, `client_actions`, `coach_actions`, `assessments`,
`assessment_instances`, `metrics`, `client_metric_values`, `client_milestones`,
`deliverables`, `support_requests`, `client_health_events`, `intervention_plans`,
`renewal_opportunities`, `offboarding_instances`, `testimonials`, `referrals`,
`case_studies`.

Built in Phase 6 (28 tables — the full 10.8 Operations set):
`teams`, `team_memberships`, `responsibilities`, `capacity_profiles`,
`capacity_allocations`, `sops`, `sop_versions`, `automation_definitions`,
`automation_runs`, `automation_errors`, `vendors`, `technology_items`, `budgets`,
`budget_lines`, `expense_categories`, `expenses`, `legal_documents`,
`legal_document_versions`, `risks`, `incidents`, `continuity_plans`,
`integration_providers`, `integration_accounts`, `source_of_truth_rules`,
`field_mappings`, `sync_rules`, `sync_runs`, `webhook_events`.

Built in Phase 7 (13 tables — the 10.9 remainder: KPIs, prompt library, and the
full AI Team object set):
`kpis`, `kpi_values`, `prompt_templates`, `prompt_versions`, `ai_agents`,
`ai_agent_versions`, `ai_knowledge_sources`, `ai_runs`, `ai_run_sources`,
`ai_outputs`, `ai_approvals`, `ai_feedback`, `ai_cost_events`.

Nothing remains unbuilt from Section 10's canonical object model. Every table
named across 10.3 through 10.9 exists in `itxfgxmdyqpcytmgdysa` as of Phase 7.

Built in Phase 8, subset A (8 tables — subscription billing/entitlements, usage
tracking, and data governance; not part of Section 10's numbered object model,
since Phase 8 is a later, additive product stage rather than one of the
original 10.3-10.9 modules):
`subscription_plans`, `plan_prices`, `plan_entitlements`, `workspace_subscriptions`,
`usage_counters`, `billing_webhook_events`, `data_export_requests`,
`data_deletion_requests`.

Not yet built from Phase 8's full requirement list: template marketplace,
certified implementation pathways, white-label client workspace options,
privacy-safe benchmarking, mobile/voice-first refinements, and multi-brand/
multi-business enhancements beyond what `business_units` (Phase 1) already
provides — deferred to explicit future requests per the user's own scoping
decision (see Assumptions Recorded in Phase 8 below).

**Also built, alongside Phase 8: `/settings/users`** — the first of the
never-built Section 5/10.3 Settings placeholders to actually be built out,
adding a real invite flow and closing Phase 8's own "seats are not enforced
yet" gap. No new tables; `workspace_members` gains two columns
(`access_review_at`, `invited_email`) and a new `enforce_seat_limit` trigger
(see Assumptions below). (The rest of Settings is now built too — see below.)

**Also built: the Knowledge and Asset Library (all 11 `/library/*` routes)
and `/search`** — the last unbuilt canonical route section from Appendix A.
One new table, `knowledge_entries` (176th table), backs Business Brain's
two categories with no prior home (Policies, Glossary); the other nine
categories (business identity, founder/leadership, vision/strategy,
business model, market/positioning, brand/messaging, offers/pricing,
proof, decisions) are surfaced as links into their existing Phase 3/1
pages rather than duplicated. `templates.template_type` (free text since
Phase 1, never written to until now) gained a check constraint listing
Section 9's 16 named template types. Brand, Offer Collateral, Client
Resources, Content, Recordings, and Research are genuine new CRUD on the
existing `assets`/`asset_versions`/`tags` tables (Phase 1), scoped by
`asset_type`; SOPs and Agreements are read-only indexes linking back to
their richer existing homes (`/operations/sops`, `/operations/legal-risk`,
`/revenue/contracts`) rather than a second store for the same data. See
Assumptions below.

**Also built: the remaining 7 `/settings/*` routes, completing the entire
Settings section of Appendix A.** No new tables — everything needed
(`workspaces`, `business_units`, `roles`/`permissions`/`role_permissions`,
`notification_preferences`, `user_profiles.accessibility_preferences`)
already existed from Phase 1, just without a UI. One new trigger,
`enforce_business_unit_limit`, mirrors `enforce_seat_limit` exactly and
closes the "business-unit limits are not enforced" gap Phase 8 and
Settings/Users both documented. Business Units gets full CRUD (its first
UI ever); Roles and Permissions finally gives the seeded 15-system-role/
18-permission/170-role_permissions catalog a real interface, with
workspace-custom roles editable and system roles read-only; Notifications
is personal `notification_preferences` CRUD across Section 14.4's 13 named
trigger types; Accessibility adds manual reduce-motion/high-contrast/
large-text overrides mirroring the theme cookie's pattern; Integrations
and AI Policies are read-only indexes linking to their richer existing
homes (`/operations/integrations`, `/ai/policies`), the same choice made
for Library's SOPs/Agreements. See Assumptions below. **Every canonical
route in the app is now built.**

**Also built: the template marketplace, the first item of Phase 8's
deferred remainder and the first feature in this build where content
becomes readable across the workspace-isolation boundary every RLS policy
since Phase 1 has assumed.** One new table, `template_marketplace_listings`
(177th table). Two explicit user decisions were made before building,
since this genuinely changes the security model: (1) self-serve snapshot
publish/install — publishing copies a template's current version content
into a listing, installing copies that snapshot into the installing
workspace's own `templates`/`template_versions` as an independent row,
never a live link back to the source workspace's actual data; (2) a
`certified` column exists (matching the spec's "certified implementation
pathways" language) but nothing can set it true, since this app has no
platform-operator/superadmin role at all — every role is workspace-scoped.
Lives inside the existing `/library/templates` page rather than a new
top-level route, since Appendix A has no marketplace route. White-label
workspaces, cross-tenant benchmarking, mobile/voice refinements, and
multi-brand enhancements remain deferred. See Assumptions below.

## 10.1 Data Architecture Principles

- Every tenant-owned record must include `workspace_id`.
- Every mutable record must include `created_at`, `created_by`, `updated_at`, and
  `updated_by` where practical.
- Deletion should use archival or soft-delete behavior for business-critical records
  unless regulation requires permanent deletion.
- Human-readable status labels must map to stable internal codes.
- Stage changes, approvals, financial changes, permissions, and AI actions require
  audit history.
- External identifiers must be stored separately from canonical internal identifiers.
- Source-of-truth rules must be configurable by module and field.
- AI outputs must retain source references, model metadata, prompt version, approval
  state, and editor history.
- Client-facing and internal-only content must be explicitly separated.
- Sensitive data must be minimized, permissioned, encrypted where appropriate, and
  retained only as long as needed.

## 10.2 Standard Fields for Tenant-Owned Objects

Unless a more specific object definition overrides them, every tenant-owned table
carries:

- `id` UUID primary key
- `workspace_id` UUID foreign key
- `business_unit_id` nullable UUID
- `name` or object-specific display label
- `status` stable enum or reference value
- `owner_user_id` nullable UUID
- `assigned_team_id` nullable UUID
- `created_at`, `created_by`, `updated_at`, `updated_by`
- `archived_at` nullable
- `external_ids` JSONB or normalized relation when needed
- `metadata` JSONB only for low-risk extensibility, never as a substitute for a
  proper schema

These standard fields are in addition to the "minimum fields" listed per-object below;
they are not repeated in every row.

## Canonical Object Tables

### 10.3 Tenancy, Identity, and Governance Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `workspaces` | Tenant boundary | name, slug, timezone, currency, locale, status, subscription_plan_id |
| `business_units` | Brands, divisions, or operating entities inside a workspace | workspace_id, name, code, type, parent_id, status |
| `user_profiles` | User identity and accessibility preferences | auth_user_id, display_name, timezone, locale, accessibility_preferences |
| `workspace_members` | User membership in a workspace | workspace_id, user_id, status, invited_at, joined_at |
| `roles` | Named permission bundles | workspace_id nullable for system roles, name, description, is_system |
| `permissions` | Atomic capabilities | code, resource, action, description |
| `role_permissions` | Role-to-permission assignments | role_id, permission_id |
| `member_roles` | Workspace member role assignment | workspace_member_id, role_id, business_unit_scope |
| `audit_events` | Immutable history of sensitive changes | actor, action, resource_type, resource_id, before_json, after_json, ip_or_context, occurred_at |
| `activity_events` | Human-readable timeline activity | subject_type, subject_id, event_type, summary, visibility, occurred_at |

### 10.4 Roadmap, Audit, Work, and Command Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `business_command_domains` | Canonical twelve-domain framework | code, name, description, display_order, active |
| `audit_templates` | Versioned audit structure | name, version, cadence, effective_at, retired_at |
| `audit_questions` | Questions and scoring rules | audit_template_id, domain_id, prompt, response_type, weight, evidence_rule |
| `audit_instances` | One completed or in-progress audit | workspace_id, template_id, period_start, period_end, status, owner_id |
| `audit_responses` | User response and evidence | audit_instance_id, question_id, response_json, score, notes, evidence_refs |
| `audit_findings` | Approved issues, strengths, and recommendations | audit_instance_id, domain_id, severity, finding, evidence, approved_by |
| `roadmap_templates` | Reusable build journeys | name, business_stage, business_model, version |
| `roadmap_instances` | Personalized workspace roadmap | template_id, workspace_id, primary_outcome, start_date, target_date, status |
| `roadmap_phases` | Ordered phases inside a roadmap | roadmap_instance_id, name, sequence, status, entry_gate_id, exit_gate_id |
| `roadmap_milestones` | Concrete build outcomes | phase_id, title, purpose, owner, due_date, definition_of_done, status |
| `milestone_dependencies` | Directed milestone prerequisites | predecessor_id, successor_id, dependency_type |
| `stage_gates` | Validation rules before progression | name, context_type, context_id, rule_mode, status |
| `gate_requirements` | Required fields, evidence, or approvals | stage_gate_id, requirement_type, field_path, validation_rule, blocking |
| `completion_evidence` | Proof that a milestone or gate is complete | subject_type, subject_id, evidence_type, asset_id, note, approved_by |
| `outcomes` | Daily, weekly, monthly, quarterly, and annual outcomes | cadence, title, owner, due_date, definition_of_done, status, review_instance_id |
| `tasks` | Shared work engine | title, description, owner, due_at, priority, status, next_action, related_object |
| `task_dependencies` | Task sequencing | predecessor_task_id, successor_task_id, dependency_type |
| `decisions` | Strategic or operational decisions | question, context, options_json, recommendation, owner, due_at, status, final_choice, rationale |
| `approvals` | Review and approval workflow | subject_type, subject_id, approval_type, requested_from, status, decision_at, comment |
| `blockers` | Work that cannot progress | subject_type, subject_id, reason, waiting_on, impact, follow_up_at, backup_plan, status |
| `comments` | Discussion on records | subject_type, subject_id, author_id, body, visibility, parent_comment_id |
| `recurring_rules` | Recurrence for tasks, reviews, and reminders | object_type, template_id, rrule, timezone, next_run_at, enabled |

### 10.5 Business Architecture Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `founder_profiles` | Founder role and leadership architecture | workspace_id, role_statement, capacity_boundaries, leadership_strengths, growth_edges |
| `decision_principles` | Reusable decision filters | workspace_id, name, principle, priority, active |
| `strategy_profiles` | Versioned strategic direction | vision, mission, strategic_thesis, horizon, effective_at, status |
| `goals` | Strategic goals | strategy_profile_id, title, metric, target, period, owner, status |
| `key_results` | Measurable results for a goal | goal_id, metric_definition, baseline, target, current_value, data_source |
| `business_models` | How value is created and captured | model_type, customer, channel, revenue_model, key_costs, constraints, version |
| `market_segments` | Addressable audiences or categories | name, type, need, evidence, size_notes, geography, priority |
| `ideal_profiles` | Configurable B2B, B2C, and partner profiles | pathway, roles, industries, needs, signals, disqualifiers, weights_json |
| `positioning_profiles` | Positioning and differentiation | audience, category, problem, promise, differentiation, alternatives, proof_refs |
| `brand_profiles` | Canonical voice and message source | voice_attributes, vocabulary, avoid_list, signoff, formality, compliance_language |
| `message_pillars` | Reusable themes and claims | brand_profile_id, title, message, audience, proof_required |
| `claim_rules` | Approved, restricted, and prohibited claims | claim_text, status, scope, required_disclaimer, approved_by, expires_at |
| `proof_items` | Testimonials, outcomes, credentials, and evidence | type, title, statement, source, consent_status, asset_id, approved_use |
| `offers` | Stable offer identity | name, offer_type, audience, status, current_version_id |
| `offer_versions` | Versioned scope and promise | offer_id, version, problem, desired_outcome, format, duration, eligibility, effective_at |
| `offer_deliverables` | Promised deliverables | offer_version_id, title, description, owner_role, client_visible, sequence |
| `offer_pricing` | Price and payment options | offer_version_id, currency, price, billing_type, installments, deposit, effective_at |
| `offer_capacity_models` | Delivery and load assumptions | offer_version_id, max_clients, coach_hours, prep_hours, support_hours, team_hours |
| `offer_economics` | Cost, margin, and viability model | offer_version_id, delivery_cost, software_cost, acquisition_cost, gross_margin, minimum_enrollment |

### 10.6 Revenue and Relationship Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `people` | Canonical person record | preferred_name, first_name, last_name, email, phone, timezone, consent_status |
| `organizations` | Canonical organization record | name, domain, industry, size_band, revenue_band, location, website |
| `relationship_roles` | A person or organization may hold many roles | subject_type, subject_id, role_type, start_at, end_at, status |
| `relationship_links` | Person-to-organization and relationship connections | from_subject, to_subject, relationship_type, source, confidence |
| `lead_sources` | Standardized source taxonomy | name, source_type, parent_source_id, active |
| `leads` | Qualification entry point | person_id, organization_id, source_id, pathway, owner, acquired_at, status |
| `research_projects` | AI or human research requests | goal, pathway, criteria_json, source_selection, status, requested_by |
| `research_findings` | Source-grounded findings | research_project_id, subject, fact_or_inference, statement, source_url, confidence, researched_at |
| `lead_scores` | Transparent fit, engagement, intent, and priority scores | lead_id, fit_score, engagement_score, intent_score, priority_score, explanation_json, calculated_at |
| `campaigns` | Coordinated marketing or outreach initiative | name, objective, audience, offer_id, channel, dates, budget, owner, status |
| `campaign_members` | Relationship participation in a campaign | campaign_id, person_id, organization_id, status, entered_at, exited_at |
| `content_assets` | Market-facing content record | title, format, audience, funnel_stage, campaign_id, offer_id, cta, status, published_url |
| `nurture_sequences` | Reusable communication sequence | name, audience, trigger, stop_conditions, status, version |
| `nurture_steps` | Ordered sequence action | sequence_id, step_order, delay, channel, template_id, owner_rule |
| `interactions` | Calls, emails, meetings, social touches, and notes | person_id, organization_id, opportunity_id, direction, channel, outcome, summary, occurred_at |
| `outreach_messages` | Drafted or sent outreach | interaction_id, template_id, subject, body, approval_status, sent_at, provider_message_id |
| `pipeline_definitions` | Versioned pipelines | name, pathway, active_version, status |
| `pipeline_stages` | Ordered stage with gates | pipeline_id, name, sequence, probability, expected_days, entry_gate_id, exit_gate_id |
| `opportunities` | Commercial or partnership opportunity | name, primary_contact_id, organization_id, offer_id, pipeline_id, stage_id, owner, value, close_date, next_action |
| `opportunity_stakeholders` | Decision makers and influencers | opportunity_id, person_id, role, influence_level, decision_authority |
| `stage_history` | Immutable stage movement | opportunity_id, from_stage_id, to_stage_id, moved_by, moved_at, reason |
| `discovery_sessions` | Qualification and discovery record | opportunity_id, occurred_at, current_state, desired_state, consequences, timing, budget, decision_process, fit_status |
| `proposals` | Proposal identity | opportunity_id, current_version_id, status, sent_at, expires_at |
| `proposal_versions` | Versioned commercial proposal | proposal_id, version, scope_json, price_json, terms_summary, asset_id, approved_by |
| `contracts` | Agreement identity | opportunity_id, current_version_id, status, signatory, effective_at |
| `contract_versions` | Versioned agreement document | contract_id, version, template_id, asset_id, terms_hash, sent_at, signed_at |
| `orders` | Accepted commercial terms | opportunity_id, offer_version_id, total, currency, payment_terms, status |
| `invoices` | Amount due | order_id, invoice_number, amount_due, due_at, status, external_invoice_id |
| `payments` | Reconciled money movement | invoice_id, provider, provider_payment_id, amount, currency, status, paid_at |
| `refunds` | Controlled refund record | payment_id, amount, reason, approval_id, status, processed_at |
| `revenue_forecasts` | Forecast snapshot | period, scenario, owner, generated_at, approved_at |
| `forecast_lines` | Forecast contribution | forecast_id, opportunity_id, amount, probability, expected_date, confidence |

### 10.7 Client Experience and Success Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `clients` | Active or former client relationship | person_id or organization_id, owner, status, start_at, end_at, source_opportunity_id |
| `client_contacts` | Contacts connected to an organizational client | client_id, person_id, role, portal_access |
| `client_offer_enrollments` | Purchased offer and terms | client_id, offer_version_id, order_id, start_at, end_at, status |
| `journey_templates` | Offer-specific client lifecycle blueprint | offer_version_id, name, version, success_definition |
| `journey_stages` | Ordered client experience stages | journey_template_id, name, sequence, entry_criteria, exit_criteria |
| `journey_touchpoints` | Communications, sessions, forms, and milestones | journey_stage_id, type, title, owner_role, timing_rule, client_visible |
| `onboarding_templates` | Reusable onboarding checklist | offer_version_id, name, version, completion_rule |
| `onboarding_instances` | One client onboarding process | client_enrollment_id, template_id, owner, status, started_at, completed_at |
| `onboarding_items` | Client or internal requirement | onboarding_instance_id, title, actor_type, required, due_at, status, evidence_id |
| `client_portal_access` | Portal identity and permission state | client_id, user_id, status, invited_at, last_login_at |
| `programs` | Stable coaching program identity | name, offer_id, current_version_id, status |
| `program_versions` | Versioned curriculum and delivery structure | program_id, version, outcome, format, effective_at |
| `program_phases` | Ordered program phases | program_version_id, name, sequence, objective, completion_rule |
| `sessions` | Coaching session record | client_id, program_phase_id, scheduled_at, completed_at, coach_id, agenda, internal_notes, client_summary |
| `client_actions` | Client commitments | client_id, session_id, title, due_at, status, evidence, client_visible |
| `coach_actions` | Coach or delivery-team commitments | client_id, session_id, owner, title, due_at, status |
| `assessments` | Reusable assessment instrument | name, version, questions_json, scoring_rule |
| `assessment_instances` | Client assessment response | assessment_id, client_id, opened_at, completed_at, result_json |
| `metrics` | Canonical outcome metric definition | name, unit, direction, collection_method, client_visible |
| `client_metric_values` | Time-series outcome value | client_id, metric_id, measured_at, value, source, notes |
| `client_milestones` | Outcome or implementation milestone | client_id, title, target_at, achieved_at, status, evidence |
| `deliverables` | Client deliverable and approval | client_id, title, owner, due_at, status, asset_id, client_approval_status |
| `support_requests` | Client request or issue | client_id, category, priority, summary, owner, status, response_due_at |
| `client_health_events` | Health score and contributing signals | client_id, score, status, signals_json, calculated_at, override_reason |
| `intervention_plans` | Recovery plan for at-risk clients | client_id, trigger_event_id, owner, actions_json, review_at, status |
| `renewal_opportunities` | Renewal or expansion process | client_id, current_enrollment_id, recommended_offer_id, review_at, status, opportunity_id |
| `offboarding_instances` | Structured completion or termination | client_id, reason, checklist_json, completed_at, archive_rules |
| `testimonials` | Consent-controlled testimonial | client_id, statement, format, consent_status, approved_channels, asset_id |
| `referrals` | Referral relationship and outcome | referring_client_id, referred_person_id, status, incentive, opportunity_id |
| `case_studies` | Structured transformation proof | client_id, situation, intervention, outcome, evidence, consent_status, asset_id |

### 10.8 Operations, Finance, Risk, and Integration Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `teams` | Functional teams | name, purpose, leader_id, status |
| `team_memberships` | Team participation | team_id, workspace_member_id, role, allocation_percent, start_at, end_at |
| `responsibilities` | Accountable ownership map | business_area, responsibility, owner_role, backup_role, review_cadence |
| `capacity_profiles` | Working limits and preferences | workspace_member_id, weekly_hours, meeting_limit, focus_blocks, recovery_rules |
| `capacity_allocations` | Planned work allocation | capacity_profile_id, period, category, planned_hours, actual_hours |
| `sops` | Stable process identity | name, business_area, owner, current_version_id, status, review_at |
| `sop_versions` | Versioned operating procedure | sop_id, version, purpose, trigger, steps_json, qa_json, escalation_json, effective_at |
| `automation_definitions` | Governed automation configuration | name, trigger, conditions_json, actions_json, owner, risk_level, enabled, version |
| `automation_runs` | Automation execution history | automation_id, trigger_record, started_at, completed_at, status, result_json |
| `automation_errors` | Failure and recovery record | automation_run_id, error_code, message, retry_count, next_retry_at, resolved_at |
| `vendors` | External provider relationship | name, category, owner, cost, renewal_at, risk_rating, status |
| `technology_items` | Software and technical inventory | vendor_id, product, purpose, owner, license_count, cost, renewal_at, data_classification |
| `budgets` | Approved financial plan | period, scenario, currency, owner, status, approved_at |
| `budget_lines` | Budget category and amount | budget_id, category, offer_id nullable, planned_amount, actual_amount |
| `expense_categories` | Standard financial taxonomy | name, parent_id, tax_treatment_note, active |
| `expenses` | Operating expense record or summary | vendor_id, category_id, amount, occurred_at, offer_id nullable, source |
| `legal_documents` | Stable legal or policy document identity | name, document_type, owner, current_version_id, review_at, status |
| `legal_document_versions` | Versioned terms, policies, and agreements | legal_document_id, version, asset_id, effective_at, approved_by, jurisdiction_note |
| `risks` | Business risk register | category, title, probability, impact, severity, owner, response_plan, review_at, status |
| `incidents` | Realized operational, security, or client incident | risk_id nullable, occurred_at, severity, summary, response, resolution, lessons |
| `continuity_plans` | Business continuity response | scenario, owner, activation_rule, response_steps, communication_plan, test_at |
| `integration_providers` | Provider capability definition | name, adapter_code, capabilities_json, auth_methods, active |
| `integration_accounts` | Workspace provider connection | provider_id, workspace_id, auth_reference, status, connected_at, last_success_at |
| `source_of_truth_rules` | Canonical ownership by module or field | module, field_path, provider_id, direction, conflict_rule |
| `field_mappings` | Internal-to-external field mapping | integration_account_id, object_type, internal_field, external_field, transform_rule |
| `sync_rules` | Trigger and schedule configuration | integration_account_id, object_type, event, direction, frequency, enabled |
| `sync_runs` | Synchronization history | sync_rule_id, started_at, completed_at, created_count, updated_count, error_count, status |
| `webhook_events` | Idempotent inbound event ledger | provider_id, external_event_id, event_type, payload_hash, received_at, processed_at, status |

### 10.9 Reviews, AI, Notification, and Library Objects

| Object | Purpose | Minimum fields and relationships |
|---|---|---|
| `review_templates` | Versioned daily through annual review format | cadence, name, version, source_rules_json, questions_json, output_rules_json |
| `review_instances` | One review period and snapshot | template_id, period_start, period_end, owner, status, completed_at |
| `review_responses` | Human response to review prompt | review_instance_id, question_key, response_json, evidence_refs |
| `review_findings` | Approved conclusion or recommendation | review_instance_id, category, severity, statement, evidence, approved_by |
| `kpis` | Metric definition | name, formula, unit, direction, cadence, source_rule, owner |
| `kpi_values` | Time-series metric value | kpi_id, period_start, period_end, value, source, calculated_at, approved_at |
| `ai_agents` | Stable AI role identity | name, purpose, owner, current_version_id, status |
| `ai_agent_versions` | Versioned model, prompt, tool, and permission configuration | agent_id, version, model, system_prompt, tools_json, permission_level, effective_at |
| `ai_knowledge_sources` | Authorized grounding source | agent_id, source_type, source_id, access_scope, freshness_rule, active |
| `ai_runs` | One AI execution | agent_version_id, user_id, purpose, input_hash, started_at, completed_at, status, cost |
| `ai_run_sources` | Records used by the run | ai_run_id, source_type, source_id, excerpt_hash, authorization_basis |
| `ai_outputs` | Draft, recommendation, or analysis | ai_run_id, output_type, content, confidence, approval_required, status |
| `ai_approvals` | Human decision on AI output | ai_output_id, reviewer_id, status, edits_summary, decided_at |
| `ai_feedback` | Quality and usefulness feedback | ai_output_id, rating, issue_type, comment, submitted_by |
| `ai_cost_events` | Token, model, and tool cost ledger | ai_run_id, provider, model, input_units, output_units, tool_cost, total_cost |
| `prompt_templates` | Stable prompt purpose | name, use_case, owner, current_version_id, status |
| `prompt_versions` | Versioned prompt text and variables | prompt_template_id, version, body, variables_json, test_notes, effective_at |
| `notifications` | In-app or external alert | recipient_id, type, severity, subject_type, subject_id, message, action_url, read_at |
| `notification_preferences` | User channel and batching rules | user_id, notification_type, channel, cadence, quiet_hours, enabled |
| `assets` | Canonical file or content asset | title, asset_type, owner, current_version_id, visibility, status |
| `asset_versions` | Versioned stored file or content | asset_id, version, storage_path, mime_type, checksum, created_by, approved_at |
| `folders` | Library organization | workspace_id, parent_id, name, visibility |
| `tags` | Shared controlled taxonomy | workspace_id, category, name, active |
| `asset_tags` | Asset-to-tag relation | asset_id, tag_id |
| `templates` | Reusable business template identity | name, template_type, owner, current_version_id, status |
| `template_versions` | Versioned template content and fields | template_id, version, schema_json, content, effective_at |

## 10.10 Critical Relationship Rules

- A person may belong to multiple organizations and hold multiple relationship roles.
- A lead references the canonical person or organization rather than duplicating
  contact information.
- An opportunity may have multiple stakeholders but one active pipeline and stage at
  a time.
- An offer has stable identity and versioned scope, price, capacity, and economics.
- A proposal and contract may have many versions but only one current approved
  version.
- An order must reference the accepted offer version and commercial terms.
- A payment must reference an invoice, order, or documented manual reason.
- A client may have multiple enrollments over time.
- Onboarding, program delivery, and journey records must reference the purchased
  offer version.
- Client-facing summaries and internal notes must be stored separately.
- Renewal, testimonial, referral, and case-study records belong to the continuing
  client relationship.
- Every external communication must reference a person, organization, opportunity,
  client, campaign, or support request when applicable.
- Every active task must have an owner and a next action or explicit completion
  condition.

## Assumptions Recorded in Phase 0

- The spec lists "minimum fields" per object; it does not fully specify column types,
  indexes, or foreign-key `ON DELETE` behavior. Phase 1 migrations will make those
  choices explicitly (soft-delete via `archived_at` rather than cascading hard
  deletes, per 10.1) and record deviations here.
- `business_command_domains` (10.4) is the twelve-domain framework referenced
  throughout Section 2; its seed data (the twelve domains) is a Phase 2 build
  requirement, not Phase 0/1.

## Assumptions Recorded in Phase 1

- **Deviated from cascading hard deletes where the spec's principle (10.1) calls for
  soft-delete.** `archived_at` exists on every table it makes sense for (workspaces,
  business_units, tasks, outcomes, decisions, assets, templates, etc.), but
  foreign-key `ON DELETE CASCADE` is used for true parent/child ownership (e.g.
  deleting a workspace cascades to its business_units — there's no "orphaned
  business unit" state that makes sense). Hard deletes only cascade from a
  workspace or a directly-owning parent record, never as the default for
  business-critical standalone records.
- **`workspace_id` was added to every tenant-owned table**, including junction/version
  tables the spec's "minimum fields" column doesn't explicitly list it for (e.g.
  `task_dependencies`, `asset_versions`, `asset_tags`, `template_versions`). This
  follows 10.1's principle directly ("every tenant-owned record must include
  workspace_id") and keeps RLS policies a direct column check instead of a join,
  which matters for tables that will see high write volume.
- **`review_instance_id` on `outcomes`** has no foreign-key constraint yet —
  `review_instances` doesn't exist until Phase 2 (Review Center). The column is a
  forward reference; the FK constraint will be added in the Phase 2 migration that
  creates `review_instances`.
- **`notifications` and `notification_preferences` are not tenant-scoped** the way
  most tables are — RLS keys on `recipient_id`/`user_id` matching `auth.uid()`
  directly, since a notification or preference belongs to its user regardless of
  workspace context. `notifications.workspace_id` exists (nullable) for UI filtering
  only, not as an RLS boundary.
- **Permission enforcement is intentionally coarse in Phase 1.** RLS enforces the
  workspace-membership boundary (the non-negotiable) everywhere, plus named-role
  checks (`Workspace Owner` / `Administrator`, sometimes `AI Governance Reviewer`)
  for admin-gated tables (`audit_events`, role/permission management). The
  `permissions` and `role_permissions` tables exist and are seeded as a real catalog,
  but no RLS policy yet queries them directly for a resource.action.scope decision —
  that's a later refinement once real per-role configuration UI exists to manage it.
  See [permissions-and-rls.md](permissions-and-rls.md).
- **"Current workspace" has no persisted selection mechanism yet.** A user with
  multiple workspace memberships gets whichever workspace RLS/the query returns
  first — there's no cookie or preference row remembering their last choice. Real
  workspace switching is a near-term follow-up, not deferred to a specific later
  phase, since it's needed as soon as more than one workspace/user exists in
  practice.

## Assumptions Recorded in Phase 2

- **`audit_questions.score_category` (`build_completion` | `operating_health`) is an
  addition beyond the spec's literal minimum fields** for that table. Section 9.6
  names the two independent measures used to reassess a domain but doesn't specify
  the mechanism connecting a question to one of them — this column is that
  mechanism, and `audit_domain_scores` (a view, not a stored/duplicated column)
  aggregates responses per domain per category.
- **`business_command_domains`, `audit_templates`, `audit_questions`,
  `roadmap_templates`, and `review_templates` are treated as global reference data**
  (no `workspace_id`), consistent with the spec listing no `workspace_id` in their
  minimum fields — they're shared framework/template content, not per-tenant rows.
  Everything generated *from* them per workspace (`audit_instances`,
  `roadmap_instances`, `review_instances`, and everything under them) is tenant-owned
  as usual.
- **Gate enforcement is two concrete triggered rules, not a generic rule
  interpreter.** The spec's `gate_requirements.validation_rule` (jsonb) implies an
  arbitrarily flexible rule language, but nothing in the spec defines that language.
  Phase 2 implements exactly the two rules it needs — a milestone requires approved
  `completion_evidence` before it can be marked done; a phase requires all its
  milestones done before it can be marked complete — enforced by database triggers
  (`enforce_milestone_gate`, `enforce_phase_gate`), verified with a real,
  transaction-wrapped SQL test proving both the blocking and unblocking cases
  (`supabase/tests/roadmap_gate_enforcement.sql`). A generic rule interpreter is a
  reasonable later refinement once more requirement types are actually needed.
- **`review_templates` are self-describing** (`questions_json`/`output_rules_json`)
  rather than driving six hardcoded per-cadence code paths — matching Section 9.9's
  own framing that "every review template must define... required questions,
  required outputs... resulting tasks, decisions, and roadmap updates." One generic
  form component and one generic completion action serve all six cadences.
- **Quarterly review completion both launches a new `audit_instances` row and adds
  its "quarterly priorities" outcomes directly as `roadmap_milestones` in the
  roadmap's current active phase** — the concrete interpretation of Section 9.6
  tying the quarterly review to the twelve-domain reassessment and Section 18's
  "roadmap updates" acceptance-criterion language, rather than a vaguer activity-log
  entry.
- **Evidence approval is self-approval in Phase 2.** Whoever submits
  `completion_evidence` is recorded as its own `approved_by`. A separate
  approval step (someone other than the submitter reviewing evidence) is a
  reasonable later refinement once delivery/review roles exist to make that
  distinction meaningful — Phase 2 has no such role structure yet.

## Assumptions Recorded in Phase 3

- **Section 10.5's field lists are explicitly "minimum fields", not exhaustive** —
  Section 6's "Modules and fields" spec for each of the seven Business Architecture
  modules gives a fuller field list, and Phase 3's migrations implement that fuller
  list, using 10.5's names as the anchor for relational/versioning columns
  (`current_version_id`, `strategy_profile_id`, etc.). See each migration file's header
  comment for the specific per-table enrichment.
- **`goals.domain_id` and `goals.review_cadence` go beyond 10.5's literal minimum
  fields** for that object, because Section 6's stated rule for the Vision and
  Strategy module is explicit: "Every goal links to a domain, metric, owner, review
  cadence, and observable target." Without these two columns that rule can't be
  represented.
- **`ideal_profiles.is_primary` and `positioning_profiles.is_primary`** aren't in
  10.5's minimum fields either, but Section 6's stated gate for Market and Positioning
  requires knowing which ideal profile and positioning statement are primary: "At
  least one approved primary ideal profile and positioning statement exist before the
  system recommends active campaigns or prospecting."
- **`founder_profiles`, `brand_profiles`, `strategy_profiles`, and `business_models`
  are workspace singletons** — `unique(workspace_id)`, one row per workspace, an
  incrementing `version` column, and `status` (`draft`/`approved`) that resets to
  `draft` on every edit (requiring re-approval). Section 6 frames each as "Versioned
  strategic direction" / similar language describing one evolving profile revised
  over time, not a table of independent historical snapshots — the same pattern
  already used for `assets`/`templates` in Phase 1 (stable identity + a
  `current_version_id` pointer), simplified here since there's no need to keep
  every prior version queryable, only the version *number*.
- **`offer_pricing`, `offer_capacity_models`, and `offer_economics` are 1:1 with an
  `offer_version`** (`unique(offer_version_id)`), matching the comment already in
  their migration but requiring a follow-up migration
  (`20260704090000_phase3_offer_subtables_1to1.sql`) to actually add the constraint,
  needed so the Pricing and Economics page can `upsert` cleanly instead of
  accumulating duplicate rows per version.
- **AI action approval gates described in Section 6 (e.g. "before unsupervised
  internal drafting begins") are not enforced in Phase 3** — per the standing
  instruction that AI actions requiring human approval are deferred to a later
  phase. The `status` (`draft`/`approved`) field on every profile object is the data
  foundation those gates will read from once AI actions are actually built; Phase 3
  only builds the human-facing approve action, not an AI system checking it.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/business_architecture_rls.sql`) covering the `founder_profiles`
  singleton, the `strategy_profiles` → `goals` → `key_results` chain, and the
  `offers` → `offer_versions` → `offer_pricing`/`offer_capacity_models`/
  `offer_economics` chain — not just applied and assumed correct. A deliberately
  broken assertion was run once to confirm the test harness actually surfaces
  failures, per the same rigor as Phase 1 and Phase 2's tests.
- **Build history:** this phase needed three build-fix iterations after the initial
  schema/UI commit — (1) TypeScript's `never[]` inference on `: { data: [] }`
  ternary fallbacks for "skip this query" branches, fixed by using `: { data: null }`
  everywhere instead (matching the pattern already used elsewhere in the app), and
  (2) a nested-relation cast (`goals.business_command_domains`) that needed to go
  through `unknown` first since the untyped Supabase client infers a many-to-one
  join as an array by default.

## Assumptions Recorded in Phase 4

- **Outreach (`/revenue/outreach`) has no dedicated table beyond
  `outreach_messages`** — Section 10.6 doesn't define one, and Section 6's
  "core fields" for the module (qualification rationale, recommended offer,
  outreach angle, reply status, next action) are really properties of a lead
  being worked, not a separate record. They live on `leads`; the Outreach page
  is a working view joining `leads` + `research_findings` + `lead_scores` +
  `outreach_messages`, not a new object.
- **`people.consent_status` is `jsonb`, not a single text value** — Section 6
  explicitly describes "Consent by channel" (plural/structured: email consent,
  SMS consent, etc. can differ), which 10.6's literal `consent_status` column
  name doesn't capture on its own.
- **`pipeline_stages.entry_gate_id`/`exit_gate_id` reuse the `stage_gates` table
  from Phase 2** rather than a new gate mechanism — 10.6 names these fields
  after exactly that object, and reusing it means pipeline stage gates get the
  same enforcement primitive as roadmap gates for free whenever that's needed.
- **Opportunity stage movement is a real trigger
  (`log_opportunity_stage_change`)**, not just documentation of a rule — every
  stage change inserts a `stage_history` row and bumps `stage_entered_at`.
  `days_in_stage` is deliberately **not** a stored column; it's
  `now() - stage_entered_at` computed at query time, since there's no scheduled
  job in this build to keep a stored value from going stale.
- **Sent proposal versions are immutable by a real trigger
  (`enforce_proposal_version_immutability`)**, matching Section 6's stated rule
  verbatim ("Sent proposals are immutable. Revisions create new versions.") —
  attempting to update a `proposal_versions` row once the parent `proposals`
  row has left `draft` status raises a Postgres exception rather than silently
  succeeding.
- **`payments` has `unique(provider, provider_payment_id)`** — the idempotency
  guard for Section 6's stated automation rule ("Duplicate provider events must
  not duplicate payments or onboarding"). Only the payments half is enforced
  yet; the onboarding half can't be, since `onboarding_instances` doesn't exist
  until Phase 5 (Client Experience).
- **`refunds.approval_id` routes through the existing Phase 1 `approvals`
  table** rather than a bespoke refund-approval mechanism — refund issuance is
  exactly the "prepare only, no AI execution without human approval" action
  Appendix C describes, and the approvals queue already exists to serve that
  purpose for every other gated action.
- **Caught and fixed a self-introduced bug during this phase**:
  `revenue_forecasts.scenario` defaulted to `'base'`, which wasn't one of its
  own check constraint's allowed values (`best_case`/`base_case`/`downside`) —
  would only have surfaced if a row were ever inserted relying on the default
  rather than specifying scenario explicitly. Fixed via a follow-up migration
  before it could bite anyone.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/revenue_engine_rls.sql`) covering cross-tenant isolation
  across the `people`/`organizations`/`leads` chain and the
  `opportunities` → `proposals` → `proposal_versions` chain, plus both new
  triggers (stage-history logging and proposal immutability). Along the way,
  a same-transaction `now()` vs. `now()` timestamp comparison in the test
  itself produced a false failure — `now()` is frozen at transaction start for
  the whole `BEGIN;...ROLLBACK;` block, so it can never detect a same-transaction
  change. Corrected to rely only on the `stage_history` row as proof the
  trigger fired, not a timestamp delta.
- **This phase's build reached `READY` on the first deploy** — the two
  TypeScript pitfalls that took multiple iterations to find in Phase 3
  (`never[]` ternary fallbacks, nested-relation casts needing `as unknown as`)
  were applied proactively from the start this time, based on what Phase 3's
  build failures taught.

## Assumptions Recorded in Phase 5

- **`clients.status` includes `onboarding` as a distinct state beyond 10.7's
  "active or former" framing** — Section 6's stated Onboarding gate is
  explicit ("Payment, agreement, portal, required intake, and kickoff
  requirements are satisfied before the client becomes Active"), which only
  makes sense if there's a state before Active to satisfy those requirements
  in.
- **`journey_templates.status` and `program_versions.status`
  (`draft`/`published`) go beyond 10.7's literal minimum fields** — Section
  6 states explicit gates for both ("Every active offer has a published
  client journey template"; program versions need a published/draft
  distinction for the immutability rule below), which can't be represented
  without a status column.
- **`onboarding_instances.kickoff_date` and `risk_status`** are named
  directly in Section 6's fuller field list for the Onboarding module,
  richer than 10.7's minimum fields.
- **`sessions.client_summary_status` (`draft`/`reviewed`/`released`) is an
  addition beyond 10.7's minimum fields** — Section 6's stated rule is
  explicit ("A shared summary is reviewed before client release"), which
  needs a review state distinct from just having a summary. `internal_notes`
  and `client_summary` are separate columns, matching 10.1's principle that
  client-facing and internal-only content must be explicitly separated.
- **Published program versions are immutable by a real trigger
  (`enforce_program_version_immutability`)**, the same pattern as Phase 4's
  sent-proposal immutability and matching Section 6's stated rule verbatim
  ("Published program versions are immutable for existing enrollments.
  Changes for future clients create a new version.") — attempting to update
  a `program_versions` row once its own `status` is `published` raises a
  Postgres exception. Unlike proposal immutability (gated on a *parent*
  row's status), this gate is on the row's own status column, since a
  program version has no separate parent object to check.
- **`client_metric_values.source` has a check constraint matching Section
  6's exact enumerated list** (`client_report`/`coach_observation`/
  `system_record`/`assessment`) — the stated rule for Outcomes and Progress
  is explicit: "Reports distinguish evidence, client report, coach
  observation, and inference," which only holds if source values are
  constrained to a known set rather than free text.
- **`testimonials` and `case_studies` both carry `consent_status`
  (`pending`/`granted`/`revoked`)** — the stated Advocacy rule is explicit:
  "No public use occurs without explicit permission and approved wording."
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/client_experience_rls.sql`) covering cross-tenant
  isolation across the `clients` → `client_offer_enrollments` →
  `onboarding_instances` chain and the `programs` → `program_versions` →
  `program_phases` → `sessions`/`client_actions` chain, plus the new
  `enforce_program_version_immutability` trigger (a published program
  version cannot be updated; the attempt raises the expected exception).
- **Build history:** one build-fix iteration after the initial schema/UI
  commit — `NEXT_STATUS[client.status]` (a `Record<string, string>` lookup)
  was checked truthy once in a JSX conditional, then re-indexed twice more
  inside it; TypeScript's `noUncheckedIndexedAccess` types each index
  expression independently; it doesn't narrow later reads of the same
  expression just because an earlier read of it was checked. Fixed by
  computing the lookup once into a local and reusing it — the same fix
  pattern already used for `CADENCE_LABELS` in Phase 2.
- **No real browser walkthrough of any of the 12 new `/clients/*` pages
  yet** — build and typecheck are clean, and all four spot-checked routes
  (`overview`, `programs`, `active/[clientId]`, `portal`) correctly redirect
  an unauthenticated request to `/login` with a 200 rather than crashing,
  but no one has clicked through the actual UI with a real workspace and
  real data. Flagged honestly rather than checked off, consistent with
  every prior phase's documentation.

## Assumptions Recorded in Phase 6

- **`responsibilities.owner_member_id`/`backup_member_id` implement 10.8's
  `owner_role`/`backup_role` fields as FKs to `workspace_members`, not free
  text** — Section 6 describes these as "Primary owner"/"Backup owner",
  i.e. specific people, not abstract role labels. `criticality` supports
  the stated rule ("Every critical responsibility has a primary owner and,
  when continuity requires it, a backup owner") informationally only —
  backup stays nullable, since "when continuity requires it" is a judgment
  call this build doesn't try to make deterministic.
- **`team_memberships.status` and `access_review_at`, and
  `capacity_profiles.decision_limit`/`client_cap`/`energy_load`/
  `fixed_constraints` go beyond 10.8's literal minimum fields** — all are
  named directly in Section 6's fuller field lists for Team and Roles /
  Capacity, the same "10.8 lists minimum fields, Section 6 lists the fuller
  set" pattern used in every prior phase.
- **No automation is enabled without a test run, owner, error path,
  idempotency protection, and audit history" is enforced by a real trigger
  (`enforce_automation_enable_gate`)** — the same "encode the unambiguous
  rules, document the ones that aren't" pattern as Phase 2's gate triggers
  and Phase 4/5's immutability triggers. "Error path" is satisfied by the
  schema itself (the `automation_errors` table and `automation_runs.status`
  enum) rather than a per-row condition, since there's no single deterministic
  check for "does this automation have an error path" beyond the mechanism
  existing. "Every active automation and critical workflow links to an SOP
  or documented exception" is **not** hard-enforced — `sop_id` and
  `exception_note` are both nullable, since which of the two applies to a
  given automation is a judgment call the spec doesn't make deterministic.
- **`log_audit_event()` was generalized to derive `workspace_id` directly
  from any tenant table's own `workspace_id` column** (an `else` branch
  added to its existing `workspace_members`/`member_roles` special cases),
  so the same trigger function could be attached to
  `automation_definitions` without a table-specific carve-out — extending
  Section 11.6's audit coverage to automation enable/disable, the same
  "coverage widens as new sensitive tables are built" progression noted in
  Phase 1's assumptions.
- **`integration_providers` is treated as global reference data** (no
  `workspace_id`, read-only to authenticated users), the same pattern as
  Phase 2's `business_command_domains`/`audit_templates` — it's a shared
  catalog of known provider adapters, not per-tenant content. Seeded with
  five starter providers (Stripe, Google Calendar, QuickBooks, Zoom,
  Mailgun) covering the integration types Section 6 names most concretely.
- **`integration_accounts.auth_reference` is a text reference, never a raw
  credential** — Section 6's stated rule is explicit: "Credentials are
  encrypted and never exposed client-side." This is a naming/discipline
  choice (no raw-secret column is ever added), not a constraint the
  database enforces on its own.
- **`webhook_events` has `unique(integration_account_id, external_event_id)`**
  — the same idempotency-guard pattern as Phase 4's
  `payments.unique(provider, provider_payment_id)`, directly serving
  Scenario I in Section 19.2 ("retry is safe and idempotent").
- **The Operations Overview's stated rule ("Every critical operational
  alert has an owner, response action, and date") is not enforced** — the
  overview page queries live counts (critical responsibilities without
  backup, automations not yet enabled, open risks, SOPs due for review,
  integration errors, vendor renewals due) but there is no dedicated
  action-queue object tying a specific alert to a specific follow-up task
  yet. The existing `tasks`/`work` engine from Phase 1 is the natural home
  for that follow-up once built, flagged as a deferral rather than guessed
  at.
- **AI action rules described for this module (Legal and Risk's "AI may
  organize and summarize but does not issue legal conclusions") are not
  enforced** — per the standing instruction that AI actions requiring
  human approval are deferred to the AI Team build in a later phase.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/operations_rls.sql`) covering cross-tenant isolation on
  a representative cross-section (teams, responsibilities, vendors,
  technology items, integration accounts, and the global provider catalog)
  and the automation-enable gate trigger — all three blocking cases (no
  owner, no idempotency strategy, no passing test run) and the positive
  case (enabling succeeds once all three are satisfied, and the enable is
  written to `audit_events`).
- **This phase's build reached `READY` on the first deploy** — zero
  build-fix iterations, matching Phase 4's clean first pass. The
  established TypeScript pitfalls (`never[]` ternary fallbacks,
  nested-relation casts needing `as unknown as`, and repeated
  `Record`-index reads under `noUncheckedIndexedAccess`) were applied
  proactively from the start across all 10 new pages.

## Assumptions Recorded in Phase 7

- **Governance scaffolding only, no live LLM provider integration** — the
  user was asked explicitly whether Phase 7's agents should call a real
  model or whether this phase should build the data model, RLS, and UI
  without wiring one up, and chose the latter. No API key, provider SDK,
  or per-call cost is introduced by this phase. `/ai/runs` instead offers a
  manual "record AI work for review" form that writes to the same
  `ai_runs`/`ai_outputs` tables a live agent would use, so the governance
  layer is real and testable ahead of any future live integration.
- **`ai_agent_versions` is enriched with `capabilities`, `allowed_data`,
  `prohibited_actions`, `provider`, and `retention_policy`** — all named
  directly in Section 6's "Agent fields" list, richer than 10.9's minimum
  fields.
- **`permission_level` reuses Section 6's stated permission ladder verbatim**
  (`read_and_analyze` / `draft` / `prepare_actions` /
  `execute_low_risk_internal` / `human_approval_required`) as its check
  constraint rather than free text — the same ladder Appendix C's Human
  Approval Matrix maps onto, and the concrete value this phase's approval
  gate reads to decide whether a recorded output needs review.
- **`ai_knowledge_sources.source_id` is a polymorphic reference**
  (`source_type` + `source_id`, no FK), the same pattern already used by
  `activity_events` and `comments` — a knowledge source can point at almost
  any object type in the system, so no single foreign key table fits.
- **Seeded the 10 recommended agents from Section 6** (Chief of Staff,
  Business Architect, Market Researcher, Offer Strategist, Brand Voice
  Guardian, Content Director, Revenue Assistant, Client Success Assistant,
  Operations Architect, Finance and Risk Analyst) via a one-click seed
  action on `/ai/agents`, each created with a first draft version rather
  than pre-populated as static rows — a workspace owner can still edit or
  remove any of them.
- **THE APPROVAL GATE — Appendix C's Human Approval Matrix is now actually
  enforced, closing the standing deferral that has applied to every phase
  since Phase 3.** `enforce_ai_output_approval_gate` blocks any
  `ai_outputs` row from reaching `approved` or `executed` status unless a
  matching `approved` row already exists in `ai_approvals` — checked on
  every insert or update, not just at creation, so no code path (this
  build's manual entry today, or a future live agent's direct write) can
  skip a human decision. This is the same "encode the deterministic rule,
  enforce it at the database layer regardless of role" pattern as every
  prior phase's gate/immutability trigger. Lower-rung actions on the
  permission ladder (`read_and_analyze` through
  `execute_low_risk_internal`) are recorded with `approval_required =
  false` and bypass the gate entirely, matching Appendix C's own
  distinction between what may execute without approval and what may not.
- **`ai_outputs.risk_level` and `due_at` live on the output, not the
  approval decision** — Section 6 names both as fields of the pending
  request itself ("Risk level", "Due date" on the AI Approval Queue), so
  they describe what's waiting for review, while `ai_approvals` holds only
  the decision's own fields (reviewer, status, rationale, timestamp).
- **No dedicated KPI or prompt-library module page exists beyond 10.9's
  minimum fields** — Section 6 doesn't describe a fuller field list for
  either object the way it does for other modules; `kpis`/`kpi_values`
  back the existing Reports and Trends page, and `prompt_templates`/
  `prompt_versions` back the "Instructions" field on `ai_agent_versions`
  the same way `offer_versions` backs `offers`.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/ai_team_rls.sql`) covering cross-tenant isolation across
  `kpis`, `ai_agents` → `ai_agent_versions`, and `ai_knowledge_sources`,
  plus the approval-gate trigger through all its cases: blocked with no
  approval on file, blocked with only a rejected approval on file, and
  succeeding once an approved record exists — including a check that the
  same gate correctly allows the subsequent transition to `executed`.
- **This phase's build reached `READY` on the first deploy** — zero
  build-fix iterations, tying Phase 4 and Phase 6's clean first passes. One
  real bug was caught and fixed before it shipped, not by the build but by
  self-review: an early draft of `/ai/runs` tried to pass the selected
  agent's `permission_level` to the server action via a hidden form input
  hardcoded to the *first* agent in the list, which would have silently
  used the wrong agent's approval policy for every other selection. Fixed
  by having the server action look up the submitted `agent_version_id`'s
  `permission_level` directly from the database instead of trusting a
  client-supplied value that a static server-rendered form has no way to
  keep in sync with the user's actual dropdown selection.
- **No UI testing with a real browser or user, on top of every prior
  phase's carried-forward gap** — build and typecheck are clean, and all
  four spot-checked routes (`overview`, `agents`, `approvals`, `policies`)
  correctly redirect an unauthenticated request to `/login` with a 200,
  but no one has clicked through the actual UI with a real workspace,
  including the agent-seeding action and the full record → approve →
  execute workflow.

## Assumptions Recorded in Phase 8

- **Phase 8 is a much broader stage than any prior phase** (nine distinct
  initiatives: billing/entitlements, guided activation, usage limits,
  multi-brand enhancements, template marketplace, white-label workspaces,
  benchmarking, mobile/voice, and data governance/enterprise admin) — the
  user was asked explicitly whether to attempt the whole phase at once or
  prioritize a subset, and chose to prioritize billing/entitlements, guided
  activation, usage limits, and data export/deletion first. Template
  marketplace, white-label domains, cross-tenant benchmarking, mobile/voice
  refinements, and multi-brand enhancements are deferred to explicit future
  requests, not built or scaffolded at all in this pass — each is either
  the first genuinely cross-tenant-visible feature this codebase would need
  (marketplace, benchmarking, both of which break the "every table is
  strictly workspace-isolated" pattern every RLS policy since Phase 1 has
  assumed) or needs infrastructure outside this session (custom domain
  provisioning for white-label).
- **Real Stripe subscription billing, in test mode, by explicit user
  decision** — the user was asked whether billing should be governance
  scaffolding only (like Phase 7's AI layer) or real Stripe integration,
  and chose real integration. A second question then surfaced that the
  Stripe MCP tool available in this session is bound to the connected
  account's *live* secret key (its read calls only ever return
  `livemode: true` objects, including the user's actual pre-existing
  coaching-business products) — since a live key cannot see or create
  test-mode data, this tool cannot be used to create the plan Prices. The
  user chose to create the three test-mode Prices themselves in the
  Stripe dashboard and hand back the price IDs, keeping all live-vs-test
  key handling on their side. `plan_prices.stripe_price_id` starts `null`
  for all three plans and is filled in once those IDs are provided — until
  then, `/settings/billing`'s Subscribe buttons are disabled with a
  "Price not configured yet" label rather than attempting a broken
  checkout.
- **`subscription_plans`/`plan_prices`/`plan_entitlements` are global
  reference data** (no `workspace_id`, read-only to authenticated users),
  the same pattern as Phase 2's `business_command_domains` and Phase 6's
  `integration_providers` — plan definitions are platform-wide, not
  per-tenant content. Seeded with three tiers (solo/team/enterprise) and
  reasonable default entitlement limits (seats, business units, AI runs
  per month, enabled automations) as a starting assumption; real pricing
  amounts are whatever the user sets when creating the actual Stripe
  Prices, not guessed at here.
- **`workspace_subscriptions` grants no authenticated INSERT/UPDATE** — the
  same precedent as the `workspaces` table itself (Phase 1/2): RLS only
  allows `SELECT` for active members, since the only two writers are the
  Stripe webhook handler and the checkout/portal server actions, both of
  which use the service-role admin client after an explicit
  `isWorkspaceAdmin()` check in application code (the app-layer mirror of
  `private.has_workspace_role()`, added to `lib/data/workspace.ts` since
  server actions run under the regular RLS-scoped client, not the
  SECURITY DEFINER path SQL policies use).
- **`billing_webhook_events` has RLS enabled but deliberately zero
  policies** — completely inaccessible to `authenticated`/`anon`, the same
  "default deny, service-role only" treatment as the revoked-`EXECUTE`
  `SECURITY DEFINER` trigger functions from Phase 1. This produces one
  expected `rls_enabled_no_policy` INFO-level security-advisor finding,
  accepted by design (documented in the migration, not a gap).
  `unique(stripe_event_id)` is the idempotency guard, the same pattern as
  Phase 6's `webhook_events` table but scoped to Stripe's single
  account-wide event stream rather than a per-workspace
  `integration_account`.
- **Caught and fixed a self-introduced bug before it shipped**: the
  original `workspace_subscriptions.status` check constraint only allowed
  a subset of Stripe's real `Subscription.status` enum
  (`incomplete`/`incomplete_expired`/`unpaid`/`paused` were missing) —
  would have made the webhook handler's upsert fail and be recorded as a
  failed `billing_webhook_event` the first time Stripe sent one of those
  statuses. Fixed via a follow-up migration widening the constraint before
  any real webhook could hit it, the same "self-introduced bug caught
  during this phase" pattern as Phase 4's `revenue_forecasts` default fix.
- **Caught and fixed a second self-introduced bug before it shipped**: an
  early version of the data-export action computed the full export bundle
  and then discarded it, marking the request `completed` while pointing at
  an `assets` row with a `null storage_path` — this build has no file
  storage bucket configured, so the "export" would have produced nothing
  retrievable. Fixed by adding `data_export_requests.export_data jsonb` and
  serving it directly through an authenticated `/api/data-export/[id]`
  route instead of pretending to use the file-based assets model.
- **Two concrete usage-limit enforcement points, chosen because their UI
  and triggers already exist** — Phase 6's `enforce_automation_enable_gate`
  trigger was extended to also check the workspace's
  `automations_enabled` plan entitlement (only when the workspace has an
  active/trialing subscription with a non-null limit; no subscription or
  an unlimited/enterprise entitlement is not restricted), and Phase 7's
  `/ai/runs` "record AI work for review" action now checks and increments
  a monthly `ai_runs_per_month` usage counter via a new
  `increment_usage_counter()` `SECURITY DEFINER` RPC (needed because
  `usage_counters` itself grants no authenticated write — the same
  self-enforcing-membership-check discipline as every other `SECURITY
  DEFINER` function in this codebase). Seats and business-unit limits are
  **not** enforced yet — `/settings/users` and `/settings/business-units`
  are still unbuilt Phase-0 placeholders with no creation flow to hook a
  limit into, unlike automations and AI runs, whose UI already existed
  before this phase.
- **Data deletion is request/schedule/cancel only, not an automated
  executor** — `data_deletion_requests` supports a 30-day scheduled,
  cancellable deletion request (admin-gated insert, matching the
  `workspaces`-bootstrap admin-only precedent), but actually purging a
  workspace on its scheduled date needs a recurring job (Supabase pg_cron
  or a Vercel cron hitting a server action) that doesn't exist in this
  build — deferred rather than guessed at, the same "defer what needs
  infrastructure this build doesn't have yet" pattern as every prior
  phase's underspecified-automation deferrals.
- **Guided activation is a soft gate, not a hard paywall** — Command
  Center shows a banner linking to `/settings/billing` when a workspace has
  no active/trialing/past-due subscription, but no middleware or per-page
  check blocks access to the rest of the app. A wide-reaching hard gate
  across dozens of already-built pages from six prior phases was judged
  too high-regression-risk to add opportunistically inside this phase;
  "new workspaces can activate without developer intervention" is
  satisfied by the self-serve checkout/portal flow itself, which needs no
  hard gate to be true.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/billing_rls.sql`) covering cross-tenant isolation on
  `workspace_subscriptions`/`usage_counters`/`data_export_requests`/
  `data_deletion_requests`, global readability of the seeded plan
  reference data, the "no authenticated write" restriction on
  `workspace_subscriptions` (even for the Workspace Owner), the
  open-to-all-members insert policy on `data_export_requests` versus the
  admin-only insert policy on `data_deletion_requests`, and confirming
  `billing_webhook_events` is completely unreadable to the authenticated
  role.
- **This phase's build reached `READY` on the first deploy** — including
  installing the new `stripe` npm dependency for the first time in this
  project (no lockfile is committed, so Vercel's `npm install` picked it
  up automatically) and a correct guess at the Stripe API version string
  matching the installed SDK version, verified rather than assumed once
  the build log confirmed no type error.
- **No live Stripe environment configured yet, and no browser testing** —
  `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not yet set in
  Vercel, the Stripe webhook endpoint is not yet registered in the Stripe
  dashboard, and the three plan Prices' `stripe_price_id` values are still
  `null` pending the user creating them. Until all three are done, the
  billing flow cannot be exercised end-to-end even in test mode — flagged
  honestly rather than checked off, on top of every prior phase's
  carried-forward no-real-browser-walkthrough gap.

## Assumptions Recorded in Settings/Users

- **`workspace_members` gains `access_review_at` (date) and `invited_email`
  (text)** — Section 6's fuller field list for Users and Roles names an
  access-review date beyond 10.3's minimum fields, and `invited_email`
  captures the address at invite time since a freshly-invited member has no
  `user_profiles` row yet to display a name from.
- **`enforce_seat_limit` closes Phase 8's own documented gap** ("seats and
  business-unit limits are not enforced yet") by mirroring
  `enforce_automation_enable_gate`'s exact pattern: a real trigger on
  `workspace_members`, checked against `plan_entitlements`
  (`entitlement_key = 'seats'`) only when the workspace has an
  active/trialing subscription with a non-null limit — no subscription or
  an unlimited/enterprise entitlement is unrestricted. Business-unit limits
  remain unenforced; `/settings/business-units` is still an unbuilt
  placeholder with no creation flow to hook a limit into.
- **Caught and fixed a self-introduced bug before it shipped, the same
  "transition guard" family as Phase 6/8's automation gate**: the first
  version of `enforce_seat_limit` fired on every `UPDATE` to an
  invited/active member, not just the transition into that state — a plain
  `access_review_at` update on an already-active member incorrectly tripped
  the seat-limit block. Fixed by adding
  `tg_op = 'INSERT' or old.status not in ('invited', 'active')`, the exact
  guard `enforce_automation_enable_gate` already had. Caught by the real
  test transaction throwing an actual exception, not by inspection.
- **The invite flow uses the service-role admin client for exactly one
  call** — `auth.admin.inviteUserByEmail()`, since creating a brand-new
  `auth.users` row for someone with no account yet has no authenticated
  equivalent (the same "no authenticated equivalent exists" exception as
  the setup wizard's workspace bootstrap in Phase 2). Every write after
  that — `workspace_members`, `member_roles`, `audit_events` — goes through
  the regular RLS-scoped client, because Phase 1's existing "owners and
  admins can manage membership" policy already grants Workspace Owner/
  Administrator direct write access to `workspace_members`; verified by
  reading that exact policy's SQL rather than assuming the admin client was
  needed for the whole flow.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/settings_users_seat_limit.sql`) covering: unrestricted
  inserts with no subscription; both an `active`-status and an
  `invited`-status insert blocked once a solo-plan seat limit is reached;
  a Workspace Owner setting `access_review_at` directly via RLS with no
  admin client; and a plain member unable to change another member's
  status (0 rows affected).

## Assumptions Recorded in the Knowledge and Asset Library / Search build

- **Nine of Business Brain's eleven knowledge categories already had a
  purpose-built home from earlier phases** — Section 9's Business Brain
  names business identity, founder/leadership principles, vision and
  strategy, business model, market and positioning, brand and messaging,
  offers and pricing, proof, and decisions as knowledge categories, and
  every one of those already exists as a real object
  (`founder_profiles`, `strategy_profiles`, `business_models`,
  `market_segments`/`positioning_profiles`, `brand_profiles`,
  `offers`/`offer_versions`, `proof_items`, `decisions`). Rather than
  duplicate that data into a generic knowledge table, `/library/business-brain`
  surfaces each as a live link (and, for offers/decisions, a live count) to
  its existing page. Only the two categories with no existing table
  (Policies, Glossary) get real storage: a new `knowledge_entries` table
  (176th table overall), scoped by `knowledge_type in ('policy', 'glossary')`.
- **`knowledge_entries.version`/`status` reuse Phase 3's exact
  "living document, edit resets to draft" pattern** established for
  `founder_profiles`/`brand_profiles`/`strategy_profiles` — editing a
  policy or glossary entry bumps `version` and resets `status` to `draft`,
  requiring re-approval, rather than silently re-approving a changed
  document.
- **`templates.template_type` gained a check constraint** listing Section
  9's 16 named template types (email/SMS, outreach, campaign, content
  brief, proposal, contract, onboarding, journey/program, session,
  progress review, renewal, testimonial/referral, SOP, automation, review,
  report). It was free text since Phase 1 because no UI wrote to it yet;
  constraining it now that `/library/templates` is the first real writer
  matches the same "constrain once something actually writes here"
  reasoning as every other enum-shaped column in this schema.
- **Six Library sections are genuine new CRUD on the existing Phase 1
  assets schema** (Brand, Offer Collateral, Client Resources, Content,
  Recordings, Research) — each is `assets`/`asset_versions`/`tags` scoped
  by a soft `asset_type` convention (`'brand'`, `'offer'`,
  `'client_resource'`, `'content'`, `'recording'`, `'research'`), sharing
  one component (`components/library/AssetLibrarySection.tsx`) and one
  actions module (`lib/library/asset-actions.ts`) rather than six
  near-identical files. `asset_type` was deliberately left unconstrained
  (no check constraint) since it's already used loosely by other modules
  attaching evidence/document assets elsewhere in the schema (proposals,
  contracts, legal documents, case studies) — a hard-coded list of only
  the Library's own eight category values would wrongly restrict those
  other legitimate uses.
- **No file storage bucket is configured in this build** (the same gap
  already recorded in Phase 8's data-export work), so "add a version"
  captures a link to where the file actually lives (Drive, Dropbox, etc.)
  in `asset_versions.storage_path` rather than an uploaded file. Folder
  hierarchy management (the `folders` table) has no dedicated UI yet either
  — tags are the only organization/filter mechanism built so far.
- **SOPs and Agreements are read-only indexes, not a second CRUD surface**
  — `sops`/`sop_versions` already have full versioned CRUD at
  `/operations/sops` (Phase 6), and `legal_documents`/`contracts` already
  cover internal policy documents and client agreements
  (`/operations/legal-risk`, `/revenue/contracts`, Phases 4 and 6). Rather
  than fork a third store for the same concept, `/library/sops` and
  `/library/agreements` are searchable, read-only indexes that link back
  to the authoritative page — the same "reuse the richer existing object"
  choice Phase 4 made for Outreach.
- **Version History (`/library/history`) covers only the two version
  tables Library itself directly manages** (`asset_versions`,
  `template_versions`) — other versioned objects (`sop_versions`,
  `contract_versions`, `legal_document_versions`, `proposal_versions`,
  `program_versions`) already show their own history on their owning
  page, so including them here would be a redundant, harder-to-maintain
  second view of the same data rather than genuinely new coverage.
- **Search is a representative cross-section, not a full-text index** —
  `/search` runs a parallel `ILIKE` query across eight object types
  (tasks, decisions, opportunities, assets, templates, SOPs, KPIs, AI
  agents) chosen because each has a simple `name`/`title` column and an
  obvious section to link results back to. It does not search all 176
  tables, does not exclude archived items, and has no ranking beyond
  grouping by type — a real inverted/full-text index is a reasonable
  later refinement once usage shows which object types matter most. The
  header's search box (`components/shell/Header.tsx`, scaffolded in an
  earlier phase but never wired to a working `/search` page until now)
  already posted to this route, so no navigation change was needed beyond
  the page itself.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/library_search.sql`) covering cross-tenant isolation on
  `knowledge_entries` (the one new table this build adds) and confirming
  the new `templates.template_type` check constraint actually rejects an
  out-of-list value while accepting a valid one. Assets, asset_versions,
  folders, tags, and templates already had their RLS proven by Phase 1's
  isolation test — not repeated here, only what's new.
- **This build reached `READY` on the first deploy.**

## Assumptions Recorded in the Settings completion build

- **`enforce_business_unit_limit` mirrors `enforce_seat_limit` exactly**
  (itself mirroring Phase 6/8's `enforce_automation_enable_gate`) —
  blocks a `business_units` row from becoming `active` once the
  workspace's active/trialing subscription has a non-null
  `business_units` entitlement limit already met. No subscription or an
  unlimited (enterprise) entitlement is unrestricted. This closes the
  last of the two "seat/business-unit limits are not enforced"
  deferrals recorded in Phase 8 and again in Settings/Users — both are
  now real, tested database constraints.
- **System roles stay read-only; only workspace-custom roles get
  editable permissions.** The 15 system roles seeded in Phase 1
  (`is_system = true`, `workspace_id` null) are a shared vocabulary used
  throughout onboarding language and every prior phase's role-gated RLS
  policies (`private.has_workspace_role(...)`) — letting one workspace
  redefine what "Coach" means would make that vocabulary and every
  existing named-role check unreliable. A workspace can instead create
  its own role and assign permissions to it via `role_permissions`,
  which the app never had a UI for before this build despite being
  seeded with 170 rows since Phase 1.
- **Role deletion is blocked if any member is still assigned** — `roles`
  has no `archived_at`/status column, so removing a role is a real
  `DELETE`, which cascades to `role_permissions` and `member_roles`.
  Silently unassigning a role from active members as a side effect of
  deleting it felt like exactly the kind of silent destructive
  side-effect worth guarding against at the application layer, even
  though the database itself permits the cascade.
- **`/settings/integrations` and `/settings/ai-policies` are read-only
  indexes**, the same "reuse the richer existing object" choice made for
  Library's SOPs/Agreements sections — `/operations/integrations`
  (Phase 6) already owns the connect/disconnect/test-connection flow,
  and `/ai/policies` (Phase 7) already renders the permission ladder and
  Human Approval Matrix. Appendix A lists both pairs of routes, but
  Section 6 never describes distinct content for the Settings-side
  route in either case.
- **Accessibility preferences are mirrored into a cookie
  (`lc_a11y`), the same pattern `lib/theme/actions.ts` already uses for
  the dark/light cookie** — the authoritative value lives in
  `user_profiles.accessibility_preferences` (Phase 1), but root layout
  renders for unauthenticated pages too and shouldn't need an extra DB
  round-trip just to decide a CSS class. New CSS classes
  (`lc-reduce-motion`, `lc-high-contrast`, `lc-large-text`) mirror the
  existing `prefers-reduced-motion`/`prefers-contrast` media queries so
  a manual choice can override the OS-level default either direction.
- **Notification preferences are keyed to Section 14.4's 13 named
  "default notification triggers"** (decision due, approval requested,
  task overdue, etc.) even though no generator in this build actually
  creates `notifications` rows for most of them yet — a known,
  honestly-flagged gap (see docs/testing.md), not an oversight. The
  preferences themselves are real and ready for when trigger-side code
  lands.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/settings_business_unit_limit.sql`) covering
  cross-tenant isolation on `business_units` (never directly tested
  before now that real UI writes to it) and the new limit trigger:
  unrestricted with no subscription, blocked once a solo-plan limit of 1
  is met, and confirming an archived-status insert is unaffected by the
  guard.
- **This build reached `READY` on the first deploy.**

## Assumptions Recorded in the Template Marketplace build

- **Self-serve snapshot publish/install, confirmed with the user before
  building** — the alternative (a platform-curated catalog only, no
  workspace-to-workspace publishing) was explicitly offered and declined.
  Publishing never exposes a workspace's live `templates`/
  `template_versions` rows directly; it copies the current version's
  `content`/`schema_json` into a new `template_marketplace_listings` row.
  Installing likewise copies that listing's snapshot into the installing
  workspace's own `templates`/`template_versions` as an independent row —
  there is no foreign-key-enforced ongoing link between an installed
  template and the listing it came from beyond `source_template_id`,
  which is nullable and only ever used to trace provenance, not to keep
  data in sync.
- **`certified` exists as a column but nothing can set it true, confirmed
  with the user before building.** The spec pairs "template marketplace"
  with "certified implementation pathways," which implies an external
  reviewer — this app has no platform-operator/superadmin role anywhere;
  every role, including Workspace Owner, is scoped to one workspace. The
  alternative (skip the column entirely) was explicitly offered and
  declined, so the field matches the spec's language and is ready for a
  future superadmin review workflow, honestly documented as unbuilt
  rather than faked.
- **The cross-tenant read is a second, additive RLS policy, not a
  modification of the standard pattern** — `"publishers manage their own
  listings"` is the exact workspace-membership `for all` policy used by
  every tenant-owned table since Phase 1; `"authenticated users can
  browse published listings"` is new and additive, scoped strictly to
  `status = 'published'`. Postgres OR's permissive SELECT policies
  together, so a publisher still sees their own drafts via the first
  policy while everyone else sees only what's published via the second.
- **`increment_marketplace_install_count` mirrors
  `increment_usage_counter`'s exact self-validating `SECURITY DEFINER`
  pattern** — a requesting workspace has no general `UPDATE` right on
  another workspace's listing row, so the RPC itself re-checks
  `status = 'published'` before writing, regardless of who calls it.
- **Caught and fixed a self-introduced bug immediately, by the security
  advisor rather than by inspection**: the new RPC was left callable by
  `anon`/`public` by default (Postgres grants `EXECUTE` to `PUBLIC` on new
  functions unless explicitly revoked) — the exact same class of finding
  Phase 1's `handle_new_user()`/`log_audit_event()` and Phase 8's
  `increment_usage_counter` had already each fixed once, and this one
  slipped through only because the revoke step was omitted from the first
  migration. Fixed via an immediate follow-up migration before anything
  used the function.
- **The UI lives inside the existing `/library/templates` page, not a new
  top-level route** — Appendix A's canonical route tree has no dedicated
  marketplace route, and the non-negotiable is to build canonical routes
  from Appendix A, not invent new ones.
- **Verified with a real, transaction-wrapped SQL test**
  (`supabase/tests/template_marketplace.sql`) proving the actual
  cross-tenant boundary, not just that RLS is enabled: a draft listing
  stays invisible to another workspace, a published listing becomes
  visible, a direct cross-tenant `UPDATE` still affects 0 rows even
  though the row is readable, the install-count RPC succeeds on a
  published listing from another workspace's `authenticated` context, and
  the same RPC leaves a draft listing's count untouched even when called
  directly.
- **This build reached `READY` on the first deploy** (after the one
  advisor-caught grants fix, applied before any deploy).
