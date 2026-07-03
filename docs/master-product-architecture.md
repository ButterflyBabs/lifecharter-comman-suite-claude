# Master Product Architecture

Stack decisions and rationale for the LifeCharter Command Suite, established in
Phase 0.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Specified directly in the build brief. App Router gives per-route layouts matching Appendix A's nested tree, React Server Components for permission-safe data fetching close to Supabase, and native support for the middleware-based session refresh pattern Supabase recommends. |
| Language | TypeScript, `strict: true` | The data model (Section 10) has ~150 objects with specific relationships; static typing catches cross-object mistakes (wrong foreign key, wrong enum) at build time rather than in production. |
| Styling | Tailwind CSS | Fast to build ~90 placeholder routes and later real UI consistently; utility classes keep the design system centralized in `tailwind.config.ts` rather than scattered CSS files. |
| Backend/DB | Supabase (Postgres + Auth + Storage) | Specified directly. Row Level Security is a first-class Postgres feature, which is what makes the "RLS enforced from day one" non-negotiable practically achievable. |
| Hosting | Vercel | Specified directly. Native GitHub integration gives the required GitHub-to-Vercel pipeline with zero extra config. |
| Auth | Supabase Auth via `@supabase/ssr` | Cookie-based sessions work with Server Components and middleware; avoids hand-rolling JWT handling. |

## Repository Layout

```
app/                    Next.js App Router routes (see navigation-and-routes.md)
lib/
  supabase/
    client.ts           Browser client (anon/publishable key)
    server.ts           Server Component / Server Action client (cookie-based session)
    admin.ts            Service-role client — server-only, bypasses RLS, must be audited
  feature-flags.ts       Feature flag reader
docs/                    Required living documentation (Section 21)
supabase/
  migrations/            Versioned SQL migrations (created starting Phase 1)
_archive/
  legacy-vanilla-app/    Pre-existing hand-rolled HTML/JS app, archived (not deleted) in Phase 0
```

## Feature-Flag Strategy

Interim (Phase 0–1): static, environment-variable-driven flags in `lib/feature-flags.ts`,
one per major module/phase (`buildMode`, `runMode`, `aiTeam`, `globalControl`).
Flags gate route/nav *visibility*, never data access — Row Level Security is the only
security boundary (Section 11.3). This keeps flag logic out of the trust boundary
entirely: a hidden nav item is not a security control.

Target (Phase 1+, once `workspaces` exists): replace the static map with a
`feature_flags` table (`flag_key`, `workspace_id` nullable for a global default,
`enabled`, `rollout_note`), so flags can be toggled per workspace without a redeploy —
needed for the phased rollout described in Section 18 (a workspace shouldn't see
Phase 6 Operations tooling half-built while Phase 3 is still landing).

## Design Tokens

The brand palette from the pre-existing (archived) vanilla-JS app was carried into
`tailwind.config.ts` and `app/globals.css` (deep indigo, royal plum, sacred teal, warm
gold, ivory, taupe) as a low-risk continuity assumption — it's the same product name
and evidently an established visual identity, and reusing named tokens costs nothing
now and avoids relitigating brand color later. This is not a design-system decision;
Section 16 (Accessibility) and any brand-specific work in
Business Architecture → Brand and Messaging (`/architecture/brand`) supersede it
whenever that phase is built.

## Phase 0 Assumptions Log

Recorded per the "ask before assuming, record every assumption" instruction:

1. **Existing app in the target folder was not actually greenfield.** A working
   vanilla HTML/JS single-page app plus a "wings-out-outreach-system" module were
   already present under `lifecharter-command-suite/`, uncommitted to git, using
   their own ad hoc Supabase integration. Per user decision, archived to
   `_archive/legacy-vanilla-app/` rather than deleted or migrated. It is not part of
   the audit-based Phase 0 from Section 18 (which this build explicitly skips per
   instruction) but is preserved for reference/possible reuse of copy or logic.
2. **Appendix A supersedes Section 5 for route names** — see
   [navigation-and-routes.md](navigation-and-routes.md).
3. **Supabase MCP tooling in this environment cannot reach the specified project.**
   See [migration-and-deployment.md](migration-and-deployment.md) for full detail and
   current status.
4. **No Node.js runtime was available in the execution sandbox** used to scaffold this
   project — all config and route files were hand-written rather than generated via
   `create-next-app`/`npm install`, and `npm run build`/`npm run dev` have not been
   run to confirm the project compiles. This must be the first verification step
   done wherever `npm` is available (local machine or Vercel's build).
5. **GitHub push required a user-supplied token** for this session, since the
   execution sandbox had no stored git credentials.
