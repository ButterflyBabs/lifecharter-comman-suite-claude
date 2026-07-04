# Navigation and Routes

## Route Source of Truth: Appendix A Only

The spec contains two route descriptions that disagree with each other:

- **Section 5 (Exact Navigation and Route Structure)** uses descriptive segment names,
  e.g. `/command-center/today`, `/business-architecture/founder`, `/clients/active/:clientId`.
- **Appendix A (Canonical Route Map)** uses a compact tree with shorter segment names,
  e.g. `/command/today`, `/architecture/founder`, `/clients/active`.

Per explicit instruction ("Canonical route structure from Appendix A only — do not
invent routes"), **Appendix A is authoritative**. Section 5 is used only for the
human-readable page *titles* and grouping (its numbered list of 10 nav sections maps
1:1 to Appendix A's 10 top-level segments), not for URL segment names.

Two things Appendix A doesn't fully specify, resolved here as low-risk assumptions:

1. **Dynamic client-record segment.** Appendix A lists `active` as a bare leaf under
   `clients`, with no id placeholder. Section 5 shows `/clients/active/:clientId`.
   Resolved as a Next.js dynamic route: `app/clients/active/[clientId]/page.tsx` →
   `/clients/active/:clientId`.
2. **Root path (`/`).** Neither Section 5 nor Appendix A defines what `/` itself
   renders. Resolved as a redirect to `/command/today` (Command Center is the
   product's stated front door — see Section 20, Product Definition of Done: "A new
   coach can enter the application and understand the first correct step").
3. **Daily review has two required flows but one canonical route.** Section 9.2
   defines a "Daily opening review" at page route `/reviews/daily/open` and Section
   9.3 a "Daily close review" at `/reviews/daily/close` — but Appendix A defines only
   one route, `/reviews/daily`, with no `/open` or `/close` children. Resolved (Phase
   2) by combining both flows' required fields into one form on the single
   `/reviews/daily` page rather than inventing the two sub-routes Section 9
   describes. Same resolution pattern as issues 1 and 2 above: Appendix A wins on
   the route itself, Section 9's content requirements are honored within it.

## Canonical Route Tree (Appendix A, verbatim)

```
/command
  /today  /week  /month  /quarter  /annual
/roadmap
  /setup  /audit  /plan  /milestones  /gates  /history
/architecture
  /founder  /strategy  /business-model  /market  /brand  /offers  /pricing
/revenue
  /overview  /marketing  /content  /campaigns  /outreach  /relationships
  /pipeline  /discovery  /proposals  /contracts  /payments  /forecast
/clients
  /overview  /journey-design  /onboarding  /active/[clientId]  /programs
  /sessions  /actions  /outcomes  /health  /renewals  /advocacy  /portal
/operations
  /overview  /team  /capacity  /sops  /automations  /finance  /legal-risk
  /technology  /integrations  /vendors
/reviews
  /daily  /weekly  /monthly  /quarterly  /semiannual  /annual  /reports
/ai
  /overview  /agents  /knowledge  /approvals  /runs  /policies  /usage
/library
  /business-brain  /brand  /templates  /offers  /client-resources  /sops
  /agreements  /content  /recordings  /research  /history
/work
/decisions
/approvals
/search
/notifications
/settings
  /workspace  /business-units  /users  /roles  /integrations  /billing
  /notifications  /data-privacy  /accessibility  /ai-policies
```

This produces 93 pages (92 leaf routes + root redirect), scaffolded in `app/` with a
placeholder `page.tsx` per route and a `layout.tsx` per top-level section. See
Section 6 (Page and Module Specifications) for what each route's real UI must contain
— that is Phase 2+ work; Phase 0 only creates the addressable skeleton.

## Persistent Global Header (Section 5)

The app shell (built in Phase 1) must include:

- **Workspace selector** — switch business, brand, or client workspace.
- **Build or Run mode** — changes guidance, prompts, and roadmap behavior.
- **Global search** (`/search`) — contacts, organizations, offers, clients, tasks,
  assets, decisions, proposals, contracts, invoices, projects, knowledge.
- **Work Queue** (`/work`) — My Work, Overdue, Waiting On, Decisions, Approvals,
  Replies, Risks.
- **Approvals** (`/approvals`) — central review queue for AI drafts, external
  messages, content, pricing, contracts, payments, refunds, automation changes.
- **Notifications** (`/notifications`) — deduplicated events with direct actions.
- **Quick Add** — task, decision, note, relationship, lead, opportunity, client,
  session, asset, metric, expense, risk, or support request.
- **Help**, **Profile**.

## Context Selectors (Section 4)

- Workspace selector
- Mode selector: Build My Business or Run My Business
- Time lens: Today, This Week, This Month, Current Quarter, Annual Direction
- Pathway selector: B2B, B2C, Affiliate/Partnership, or All Pathways
- Role-aware landing view

None of these are implemented in Phase 0 — the route skeleton exists, the shell chrome
is a Phase 1 build requirement.
