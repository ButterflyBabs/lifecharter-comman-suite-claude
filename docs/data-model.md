# Data Model

Canonical database object model for the LifeCharter Command Suite, transcribed from
Section 10 of the Master Product Restructure Specification. This document is the
source of truth for schema design; no table should be created that isn't listed here
(or a documented, approved addition to it).

**Status as of Phase 4:** 96 tables are live in `itxfgxmdyqpcytmgdysa`, all with Row
Level Security enabled and zero new security-advisor findings. This is the full 10.3,
the 10.4 objects Phases 1 and 2 together require, the full 10.5 Business Architecture
objects, the full 10.6 Revenue Engine objects, and the 10.9 subset needed for
notifications, assets, templates, and reviews. Migrations live in
`supabase/migrations/`, applied via the Supabase MCP connector and tracked in
Supabase's own migration history (`list_migrations`). See
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

Not yet built (10.7/10.8's client experience/ops objects, and 10.9's
`kpis`/`kpi_values`/`ai_*`/`prompt_*` objects) — these land in Phases 5 through 7 per
the build order (Section 18), each phase adding only the objects its acceptance
criteria actually require.

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
