# Soul Tribe 🌿

*Find your people, not more profiles.*

Soul Tribe is a friendship-matching platform for adults — a calm, intentional
alternative to swipe culture. This is the complete MVP described in the PRD:
Friendship DNA onboarding, explainable compatibility matching, a finite weekly
Soul Drop, real-life Pitch Outings, host approval flows, outing-scoped chat,
private reflections, and safety by design.

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

The dev command automatically creates and seeds a local SQLite database
(`data/soul-tribe.db`) with a 14-person Singapore demo cohort, 10 outings in
various states, join requests, chats and reflections.

**Demo sign-in:** `amirah@demo.soultribe.app` / `friendship-2026`
(Amirah is also an admin — visit `/admin/reports` for the moderation queue.)

Other personas (same password): `mei@`, `darren@`, `priya@`, `weilin@`
…`@demo.soultribe.app` — sign in as two people in two browsers to exercise the
full request → accept → chat loop.

Useful scripts: `npm run typecheck`, `npm run build`, `npm run db:reset`
(fresh re-seed).

## What's inside

**Product surface** — landing page; sign up with age gate and community
pledge; 7-step Friendship DNA wizard (resumable, with a sensitive-questions
consent step and per-question "how this helps"); DNA reveal with editable,
hideable summary sections; weekly Soul Drop (finite by design — 3–5
introductions, no infinite feed); Discover for people and outings with gentle
filters; person profiles with explainable "You & them" match insights; a
4-step outing creation stepper with AI wording help; outing detail with
venue-privacy (address revealed only after acceptance), join requests, host
inbox with fit context and neutral declines; My Outings dashboard; chat that
exists only around shared plans (no open DMs); quiet notifications; private
post-outing reflections; profile editing; settings (visibility, notification
preferences, pause account); safety centre (pledge, reporting, block list);
thin admin moderation queue.

**Matching engine** (`src/lib/matching/`) — deterministic, rule-based scoring
across eight weighted dimensions (values 20%, communication 18%, rhythm 16%,
emotional 16%, activity 12%, lifestyle 10%, complementarity 5%, behavioural
3%), hard eligibility gates (blocks, visibility, deal-breakers), and
qualitative fit bands — never percentages. Explanations follow the PRD
framework: headline, why it may work, useful complement, potential friction,
best first outing — always in tentative "you seem to…" language.

**AI abstraction** (`src/lib/ai/`) — all "AI" copy (DNA synthesis, match
explanations, outing wording help) flows through an `AIProvider` interface,
currently implemented by a deterministic template provider. Swapping in
OpenAI/Anthropic later means implementing one interface; no frontend changes.

**Security** — bcrypt password hashing; opaque httpOnly session cookies;
double-submit CSRF tokens on every mutation; Zod validation shared by client
and server; input sanitisation; per-scope sliding-window rate limits (auth,
general API, AI, messaging, outing creation, reports); safe-ID checks; 404s
that don't leak resource existence; admin-gated moderation endpoints.

**Stack** — Next.js 14 (App Router, full-stack API routes), TypeScript
(strict), Drizzle ORM + SQLite (libsql), TanStack Query (optimistic UI),
Tailwind CSS with a warm design-token system (Fraunces + Nunito Sans, sand /
terracotta / forest / gold), framer-motion micro-interactions, dark-mode-ready
tokens (class strategy, disabled initially).

## Project layout

```
src/
  app/                # routes: landing, auth, onboarding, (app)/… screens
    api/              # ~30 route handlers (auth, dna, souldrop, discover,
                      #  outings, requests, chats, reflections, safety, admin…)
  components/         # design system (Button, Card, Sheet, Tabs, fields…),
                      #  cards, AppShell, providers (viewer/toast/query)
  lib/
    db/               # Drizzle schema, migrations, seed
    dna/              # question bank + answer→vector mapping
    matching/         # eligibility gates, weighted scoring, fit bands
    ai/               # AIProvider interface + template implementation
    security/         # sanitisation + rate limiting
    auth/             # sessions & CSRF
    validation/       # shared Zod schemas
    server/           # serializers, matching service, notifications
```

## Notes

The weekly Soul Drop is computed on first request per ISO week and cached per
user. Reflections are private forever — they only nudge future matching.
Blocking removes both directions from recommendations instantly and never
notifies. All timestamps render in Singapore time.
