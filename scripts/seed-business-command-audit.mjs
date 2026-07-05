#!/usr/bin/env node
// Seed generator for the canonical Business Command Audit question bank.
//
// Reads an APPROVED src/config/business-command-audit/v<version>/questions.json
// and emits a tracked SQL migration into supabase/migrations/. It NEVER invents
// text — it only transcribes approved content — and it refuses to run unless the
// bank is approved, checksum-locked, and structurally valid.
//
// Usage:
//   node scripts/seed-business-command-audit.mjs [--version v1] [--dry-run]
//
// Non-destructive supersede strategy (no hard deletes, no app change, no FK
// breakage): the current questions under the "Business Command Audit — Standard"
// template are reparented to a retired template (so historical audit_responses
// still resolve), the Standard template's version is bumped, and the approved
// bank is inserted under the Standard template. The app keeps resolving the
// active template by name, now carrying the new bank.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const version = (args.find((a) => a.startsWith("--version"))?.split("=")[1]) ?? args[args.indexOf("--version") + 1] ?? "v1";
const dryRun = args.includes("--dry-run");

const TEMPLATE_NAME = "Business Command Audit — Standard";
const ALLOWED_RESPONSE_TYPES = new Set(["scale_0_100", "scale", "boolean", "text", "upload"]);
const REQUIRED_SCORE_CATEGORIES = new Set(["build_completion", "operating_health"]);
const CANONICAL = [
  [1, "founder_leadership"], [2, "vision_strategy"], [3, "market_positioning"], [4, "offers_pricing"],
  [5, "brand_messaging"], [6, "marketing_growth"], [7, "sales_revenue"], [8, "client_journey_delivery"],
  [9, "client_success_retention"], [10, "operations_systems_technology"], [11, "team_capacity"], [12, "finance_legal_risk"],
];

function fail(msg) {
  console.error(`\n✗ Refusing to generate seed: ${msg}\n`);
  process.exit(1);
}

const dir = join(ROOT, "src/config/business-command-audit", version);
const jsonPath = join(dir, "questions.json");
const checksumPath = join(dir, "questions.checksum.txt");
if (!existsSync(jsonPath)) fail(`${jsonPath} not found`);

const raw = readFileSync(jsonPath, "utf8");

// 1) Checksum lock — approved content must not have drifted.
if (existsSync(checksumPath)) {
  const expected = readFileSync(checksumPath, "utf8").trim();
  const actual = createHash("sha256").update(raw).digest("hex");
  if (expected && actual !== expected) {
    fail(`questions.json does not match questions.checksum.txt (expected ${expected}, got ${actual}). Update the checksum only if the change is approved.`);
  }
}

let bank;
try {
  bank = JSON.parse(raw);
} catch (e) {
  fail(`questions.json is not valid JSON: ${e.message}`);
}

// 2) Approval gate.
if (bank.status !== "APPROVED") fail(`status is "${bank.status}", not "APPROVED". Populate and approve the bank first (see the v1 README).`);

// 3) Canonical domains.
const domainPairs = (bank.domains ?? []).map((d) => `${d.order}:${d.code}`).join(",");
const canonicalPairs = CANONICAL.map(([o, c]) => `${o}:${c}`).join(",");
if (domainPairs !== canonicalPairs) fail(`domains/order/codes must exactly match the canonical 12 (${canonicalPairs}); got ${domainPairs}`);

// 4) Per-question validation + collection.
const seen = new Set();
let total = 0;
const rows = [];
for (const domain of bank.domains) {
  if (!Array.isArray(domain.questions) || domain.questions.length < 4) {
    fail(`domain "${domain.code}" must have at least 4 questions (has ${domain.questions?.length ?? 0})`);
  }
  for (const q of domain.questions) {
    const text = (q.text ?? "").trim();
    if (!text) fail(`empty question text in domain "${domain.code}"`);
    if (q.questionKey && seen.has(q.questionKey)) fail(`duplicate questionKey "${q.questionKey}"`);
    if (q.questionKey) seen.add(q.questionKey);
    if (!ALLOWED_RESPONSE_TYPES.has(q.responseType)) {
      fail(`question "${text.slice(0, 40)}…" has responseType "${q.responseType}". Supported by the current audit_questions schema: ${[...ALLOWED_RESPONSE_TYPES].join(", ")}. (multiple_choice needs an options column — add a migration first.)`);
    }
    if (!REQUIRED_SCORE_CATEGORIES.has(q.scoreCategory)) {
      fail(`question "${text.slice(0, 40)}…" needs scoreCategory build_completion|operating_health (audit_questions.score_category is NOT NULL)`);
    }
    const catWeight = q.scoreCategory === "build_completion" ? q.buildCompletionWeight : q.operatingHealthWeight;
    const weight = Number.isFinite(q.weight) ? q.weight : Number.isFinite(catWeight) && catWeight > 0 ? catWeight : 1;
    rows.push({
      code: domain.code,
      text,
      responseType: q.responseType,
      scoreCategory: q.scoreCategory,
      weight,
      evidenceRule: (q.evidencePrompt ?? "").trim() || null,
      includeInSnapshot: q.includeInSnapshot === true,
    });
    total++;
  }
}
if (total < 48) fail(`the approved bank must have at least 48 questions (has ${total})`);

// 5) Emit the migration SQL.
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const snapshotCount = rows.filter((r) => r.includeInSnapshot).length;
const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const outName = `${ts}_seed_business_command_audit_${version}.sql`;
const outPath = join(ROOT, "supabase/migrations", outName);

const valuesSql = rows
  .map(
    (r) =>
      `  (v_tpl, (select id from public.business_command_domains where code = ${q(r.code)}), ${q(r.text)}, ${q(r.responseType)}, ${q(r.scoreCategory)}, ${r.weight}, ${q(r.evidenceRule)}, ${r.includeInSnapshot})`,
  )
  .join(",\n");

const sql = `-- Seed: canonical Business Command Audit question bank ${version} (${bank.version}).
-- Generated by scripts/seed-business-command-audit.mjs from an APPROVED,
-- checksum-locked src/config/business-command-audit/${version}/questions.json.
-- ${total} questions across 12 domains (${snapshotCount} tagged include_in_snapshot).
-- Source approved: ${JSON.stringify(bank.source ?? {})}
--
-- Non-destructive supersede: the current Standard-template questions are moved
-- to a retired template (historical audit_responses keep resolving), the
-- Standard template's version is bumped, and the approved bank is inserted under
-- the Standard template — so the app keeps resolving the active bank by name.

do $$
declare
  v_tpl uuid;
  v_retired uuid;
  v_old_count int;
begin
  select id into v_tpl from public.audit_templates where name = ${q(TEMPLATE_NAME)} and retired_at is null order by version desc limit 1;
  if v_tpl is null then
    raise exception 'active template "%" not found', ${q(TEMPLATE_NAME)};
  end if;

  select count(*) into v_old_count from public.audit_questions where audit_template_id = v_tpl;
  if v_old_count > 0 then
    insert into public.audit_templates (name, version, cadence, effective_at, retired_at)
    values (${q(TEMPLATE_NAME)} || ' — superseded ' || to_char(now(), 'YYYY-MM-DD'), 1, 'quarterly', now(), now())
    returning id into v_retired;
    update public.audit_questions set audit_template_id = v_retired where audit_template_id = v_tpl;
  end if;

  update public.audit_templates set version = version + 1 where id = v_tpl;

  insert into public.audit_questions
    (audit_template_id, domain_id, prompt, response_type, score_category, weight, evidence_rule, include_in_snapshot)
  values
${valuesSql};
end $$;
`;

if (dryRun) {
  console.log(sql);
  console.error(`\n(dry run) ${total} questions validated; would write ${outPath}`);
} else {
  writeFileSync(outPath, sql);
  console.log(`✓ Wrote ${outPath}`);
  console.log(`  ${total} questions, ${snapshotCount} snapshot-tagged.`);
  console.log(`  Review it, then apply via the Supabase migration workflow (CLI push or MCP apply_migration).`);
}
