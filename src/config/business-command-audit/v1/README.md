# Business Command Audit — Canonical Question Bank (v1)

**Status: `DRAFT_AWAITING_CANONICAL_TEXT`** — this bank is empty on purpose.

A forensic search on 2026-07-05 (repository, full git history, Supabase, the
91-page master spec, and the standalone audit apps) found **no** canonical
48+/12-domain Business Command Audit question bank. What exists elsewhere is
*not* canonical:

- **Live Supabase `audit_questions`** — 24 questions (2/domain), **AI-authored**
  in migration `20260704010000_phase2_domains_and_audit.sql`, currently active.
- **`_archive/legacy-vanilla-app/app.js`** — a deprecated, different "Business
  Command Audit" (four free-text canvases; no 12-domain scoring).
- **`coach-business-systems-audit.vercel.app`** — a live but structurally
  different instrument (5 sections / 20 Likert statements, sum-to-100 scoring).

So this bank must be **authored and approved by a human**. Nothing here may be
invented, paraphrased, or summarized by an assistant.

## How to populate it

1. Add real, approved questions to each `domains[].questions[]` in
   `questions.json`, **>=4 per domain (>=48 total)**. Copy the shape from the
   top-level `questionTemplate`. Per question:
   - `questionKey` — stable slug (e.g. `founder-role-defined`)
   - `text` — the exact approved wording
   - `responseType` — one of `allowedResponseTypes`
   - `scoreCategory` — `build_completion` | `operating_health` (drives the two
     independent scores; may be null for non-scored/text questions)
   - `options` — for `multiple_choice` only
   - `buildCompletionWeight` / `operatingHealthWeight` / `riskWeight`
   - `evidencePrompt`, `required`, `displayOrder`, `conditionalLogic`
2. Do **not** change domain `code`, `name`, or `order` — those are canonical and
   match `business_command_domains` in the DB (the seed maps on `code`).
3. Set `"status": "APPROVED"` and fill in `source` (who approved it, when).
4. Regenerate the checksum:
   ```sh
   shasum -a 256 src/config/business-command-audit/v1/questions.json \
     | awk '{print $1}' > src/config/business-command-audit/v1/questions.checksum.txt
   ```
5. `npm run test` — `questions.snapshot.test.ts` must pass. It enforces the
   checksum, the canonical 12-domain set/order, and (once `APPROVED`) the
   >=4/domain, >=48-total, non-empty-text rule.

## Seeding (only after approval)

The seed **generator** is ready: `scripts/seed-business-command-audit.mjs`
(run via `npm run seed:bca`). It refuses to emit anything unless this bank is
`APPROVED`, checksum-matched, has the canonical 12 domains, and has ≥4/domain
(≥48 total) with non-empty text and valid response/score types — so it can never
seed empty or unapproved content, and it only transcribes approved text (never
invents).

Once approved:

```sh
npm run seed:bca -- --dry-run   # preview the SQL
npm run seed:bca                # write supabase/migrations/<ts>_seed_business_command_audit_v1.sql
```

Then review the generated migration and apply it via the normal Supabase
workflow (CLI `supabase db push` or MCP `apply_migration`).

The generated migration uses a **non-destructive supersede**: current
Standard-template questions are reparented to a retired template (so historical
`audit_responses` still resolve), the Standard template's version is bumped, and
the approved bank is inserted under the Standard template — so the app keeps
resolving the active bank by name with no code change. No question is ever
hard-deleted.

Notes / current schema limits the generator enforces:
- `audit_questions.score_category` is **NOT NULL** → every question needs
  `build_completion` or `operating_health`.
- There is **no options column** yet → `multiple_choice` is rejected until a
  schema migration adds one.
- `weight` = the question's `weight`, else its category weight, else `1`.

## Guardrail

`questions.snapshot.test.ts` fails if `questions.json` changes without its
checksum being updated — so canonical wording can never drift silently.
