# UI Audit — c-agent-registry frontend vs. tt_poc_agent_registry reference

Read-only audit. No code was changed. Scope: `frontend/` (this repo) compared against
`/home/hank/tt_poc_agent_registry/web/` (reference repo's frontend; its `src/` is the
Node/Fastify-equivalent... actually Express/Prisma backend lives at repo root, `web/` is
the Vite/React frontend used for this comparison).

---

## 1. Current frontend (`c-agent-registry/frontend`) — inventory

### Stack
- React 19 + react-router-dom 7 + TanStack Query 5
- **Ant Design (`antd` v6) as the entire UI kit** — no custom CSS design system. `global.css`
  is 10 lines (box-sizing reset + html/body/#root height). Every visual decision (color,
  spacing, radius, shadow, type scale) is either an antd default or an inline `style={{}}`
  object written per-component.
- No dark mode, no theme tokens, no `ThemeConfig` customization of antd's theme provider found.

### Routes / pages

| Route | Page | Purpose |
|---|---|---|
| `/login` | `Login.tsx` | Email+password login, SSO button |
| `/sso/callback` | `SsoCallback.tsx` | Consumes SSO redirect token |
| `/` | `Browse.tsx` | List agents (Public / all-visible-to-me segmented toggle) via `AgentsTable` |
| `/my-agents` | `MyAgents.tsx` | Agents the user owns/is a member of; create-agent modal |
| `/agents/:slug` | `AgentDetail.tsx` | Agent detail, members, version list |
| `/agents/:agentSlug/versions/:versionSlug` | `VersionDetail.tsx` | Version detail, submit/approve/activate flows, edit-rejected-in-place |
| `/reviews` | `Reviews.tsx` | "My reviews" list (pending-only toggle) |
| `/reviews/:reviewId` | `ReviewDetail.tsx` | Single review decision form |
| `/skills` | `Skills.tsx` | Skills & MCP registry (tabs), upload |
| `/admin/users` | `AdminUsers.tsx` | User CRUD table (role select, active/disabled switch, delete) — **only existing admin/governance screen** |

10 routes total. No Browse/Agents filters beyond the public/all toggle (no search, category,
sort, pagination — `AgentsTable` renders the full unpaginated list). No Registry-wide overview,
no Review Queue (only "my reviews"), no Review/User/Agent/Deletion summary pages, no Deleted
Agents, no Statistics, no Ops Dashboard.

### Design consistency audit

**Colors** — no tokens exist. Raw hex literals are repeated ad hoc across files:

| Hex | Meaning (inferred) | Appears in |
|---|---|---|
| `#4338CA` | brand/primary (indigo) | `AppLayout.tsx:26,171`, `AgentsTable.tsx:63`, `AgentDetail.tsx:226`, `Login.tsx:61` |
| `#EEF0FE` | brand tint (avatar bg) | `AppLayout.tsx:171`, `AgentsTable.tsx:63`, `AgentDetail.tsx:226`, `Login.tsx:40` |
| `#E4E6EC` | border | `AppLayout.tsx:115,137`, `AgentDetail.tsx:213,222`, `VersionDetail.tsx:250,294,333`, `Login.tsx:49` |
| `#9AA0AC` | muted text | `AppLayout.tsx:185`, `AgentsTable.tsx:39`, `AgentDetail.tsx:132,142`, `VersionDetail.tsx:185,267,277`, `Skills.tsx:86,121`, `ReviewDetail.tsx:152`, `Login.tsx:75,108` |
| `#6B7280` | secondary muted (different gray from `#9AA0AC`, same role) | `AgentDetail.tsx:145,149,229`, `VersionDetail.tsx:342` |
| `#F6F7FA` | page background | `Login.tsx:40` only |
| `#fff` | surface | scattered, 8+ files |

Two different grays (`#9AA0AC` and `#6B7280`) are both used as "muted/secondary text" with no
apparent rule for which file gets which — likely drift, not intentional. No dark-mode variant
of any of these exists.

**Typography** — no scale. `fontSize` literals found: `10, 10, 11, 11.5, 11.5, 11.5, 12, 12,
12, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 13, 13, 13, 14.5, 15, 16` (22 occurrences, 9
distinct values, several only ±0.5px apart — e.g. `12` vs `12.5` vs `13` used interchangeably
for what reads as the same "small label" role in different files). No named scale (no `--text-xs`
equivalent) — every occurrence is a bare number at its call site.

**Spacing** — no scale. Every `padding`/`margin`/`gap` is a bare pixel number chosen per call site
(e.g. `AppLayout.tsx` alone uses `18px 18px 12px`, `9`, `26`, `28`, `0 16px 0 24px`, `12`, `9px`,
`"26px 28px 60px"`, `"18px 16px 40px"` — eight distinct spacing values in one file with no
shared unit).

**Radius** — `borderRadius: 7` (`AppLayout.tsx:25`), `8` (×4: `AgentDetail.tsx:213`,
`VersionDetail.tsx:250,294,333`), `12` (`Login.tsx:50`) — three different values for what all
read as "card/avatar corner," no token.

**Shadow** — no custom `box-shadow` found anywhere; relies entirely on antd component defaults
(`Card`, `Modal`, `Table`) wherever those are used, so shadow depth is inconsistent between an
antd `Card` and a raw `<div style={{border, borderRadius}}>` used elsewhere for the same visual
role (e.g. the brand mark, avatar, stat-like blocks).

**Summary of inline-style density** (per file, `style={{`  occurrences):
`VersionDetail.tsx` 25, `AgentDetail.tsx` 19, `AppLayout.tsx` 15, `ReviewDetail.tsx` 12,
`Login.tsx` 10, `Skills.tsx` 9, `AgentsTable.tsx` 4, `Browse.tsx` 3, `AdminUsers.tsx` 3,
`Reviews.tsx`/`MyAgents.tsx` 2. Every page hand-rolls its own layout via inline `style` objects;
there is no shared `.card`, `.stat-grid`, `.data-table`, etc.

### Component library structure

`frontend/src/components/` has only 3 files: `AppLayout.tsx` (shell/nav), `AgentsTable.tsx`
(antd `Table` wrapper, also exports a one-off `AvatarInitial`), `tags.tsx` (5 small
`antd Tag` wrappers: `VersionStatusTag`, `VisibilityTag`, `AssetRoleTag`, `UserRoleTag`,
`UserStatusTag`, `ReviewResultTag` — status-color mapping lives here per-enum, each with its
own literal `color` string, no shared status-color token).

There is **no** `StatCard`, `Leaderboard`, `TrendChart`/`DonutChart`, `Pagination`,
`ErrorMessage`, `Loading`, `FullDateTime`, or any other data-display primitive — every page
that needs a stat block, chart, or paginated list builds it from scratch (or, per the route
table above, those pages simply don't exist yet). This is the single biggest structural gap
versus the reference repo's component set (§2).

**Duplicated-but-different patterns already present in just these 10 pages:**
- Avatar-with-initials rendered 3 separate ways: `AppLayout.tsx`'s `<Avatar>`, `AgentsTable.tsx`'s
  `AvatarInitial`, and inline in `AgentDetail.tsx:226` — same visual (indigo circle, initial
  letter) implemented three times with independent style objects.
- Status/role coloring: `tags.tsx` centralizes *some* of this, but `AppLayout.tsx:178`
  (role tag on the user menu) duplicates the admin/reviewer/member → color mapping locally
  instead of reusing `UserRoleTag`.

---

## 2. Reference repo (`tt_poc_agent_registry/web`) — inventory

### Stack
- React 18 + react-router-dom 6 + TanStack Query 5, **no UI kit** — hand-rolled semantic HTML
  + a single `index.css` token file, `lucide-react` for icons. Full light/dark theme via
  `:root[data-theme]` + `prefers-color-scheme`, one variable set drives every component.
- Design tokens already exist as CSS custom properties (`--brand-*`, `--gray-0…900`, `--border`,
  `--muted`, `--bg-panel`, `--ops-*` chart colors, `--font-sans/mono`, `--text-xs…2xl`,
  `--space-1…12`, `--radius-sm/md/lg`, `--shadow-sm/md`) — see `index.css:1-110`. This is a
  mature, documented token set with inline rationale comments (e.g. why gray-0 isn't pure white,
  why the 5 categorical chart colors were chosen).
- Shared component vocabulary: `.card`, `.section-panel`, `.form-card`, `.data-table`,
  `.matrix-table`, `.stat-grid`/`.stat-card`, `.badge` + per-status modifier classes
  (`.status-pending/.status-approved/.status-rejected` etc.), `.tag-pill`, `.actions` (filter
  bar), `.table-scroll`, `.pagination*`. Every priority page below is built from this same
  vocabulary — that's *why* they look consistent already.

### Sidebar IA (from `Layout.tsx:192-262`)

```
Announcement (top-level link)
Guides        → Feature history, Agent management
Browse        → Agents, New agent
Review        → Review queue (label flips to "Approved agents" for non-reviewers), Review summary (admin only)
Governance    → Users, User summary, Agents, Agent summary, Deleted agents, Deletion summary   [admin only]
Admin tools   → Agent checklist items, Rule simulator, Data simulator, Announcement            [admin only]
Registry      → Agent templates, MCP registry, Model registry, SkillHub registry               [admin only]
Reports       → Statistics, Agent graph, Ops dashboard, Audit log                              [admin only]
```

⚠️ **Naming note for your brief:** the reference repo's sidebar group literally named
"Registry" is *not* an all-agents overview — it's the **mirrored external-registry** section
(Agent templates / MCP tools / Model endpoints / SkillHub skills, each synced from an outside
source, read-only + manual re-sync). Your priority list's item 4, "**Registry All（完整
registry 總覽）**", doesn't map 1:1 onto anything in the reference repo — closest candidates are
(a) this "Registry" group as a bundled overview, or (b) Governance → Agents (`/admin/agents`,
"every agent, public and private, across every owner" — the closest thing to an "all agents"
view). I've treated interpretation (a) in the gap list below since it's the more literal reading
of "registry," but **please confirm before Phase 3** — it changes what gets built.

### Priority screens — information architecture

#### Browse → Agents (`AgentListPage.tsx`, route `/`)
- Filters: free-text search (`q`), category, MCP tool, model, skill, sort (newest/oldest/
  name/most-downloaded/highest-rated), pricing-model select (behind `SHOW_PRICING_FILTER` flag),
  page-size limit.
- Card grid (`.agent-grid`, responsive 3→2→1 columns): avatar, name, visibility badge,
  description (2-line clamp), category badge, pricing badge, tag pills, star rating (flagged),
  download count, "updated X ago".
- Full offset/limit `Pagination` component (prev/next, jump-to-page, page-size select, total).
- No admin gate — this is the public browse page member-facing "Browse" in your priority list.

#### Review → Review Queue (`ReviewQueuePage.tsx`, route `/review-queue`)
- Status filter tabs (pending/approved/rejected) — **reviewer/admin only**; members always see
  `approved` and lose the tab control (`isReviewerOrAdmin` gate).
- `data-table`: row #, agent·version link, requested-by, status badge (+ "by {reviewer}" when
  decided), inline decision column (reason-required text input + approve/reject icon buttons,
  disabled while a per-row mutation is in flight).
- Shares the `Pagination` component; total count badge in `<h1>`.
- Row-level actions call `POST /review-requests/:id/approve|reject` and invalidate the same
  query key to refresh in place — no navigation away needed for the common case.

#### Review → Review Summary (`AdminReviewSummaryPage.tsx`, route `/admin/review-summary`)
- **Relationship to Review Queue**: explicit cross-link both directions ("aggregate stats… to
  act on a specific pending request, see Review queue"). Summary is read-only aggregates;
  Queue is the row-by-row action surface. Different endpoint (`/admin/review-summary`) — not
  a client-side aggregation of the queue's data.
- Layout pattern (repeats on every *Summary page): `stat-grid` of `StatCard`s → `TrendChart`
  (30-day approved/rejected line) → 1-2 `Leaderboard`s (top reviewers, most-failed checklist
  items).

#### Governance → Users (`AdminUsersPage.tsx`, route `/admin/users`)
- Filters: search, role, status (all/active/deactivated), sort, page size.
- `data-table` with row checkboxes + bulk "Deactivate selected"; per-row inline edit
  (name/email/role → Save/Cancel swaps the cells to inputs in place, no modal); per-row actions:
  edit, deactivate (native `confirm()`), reissue API key (shows the new key once, inline banner
  row). Status badge (`active`/`deactivated`) + full deactivation timestamp.
- Materially richer than this repo's `AdminUsers.tsx` (which has create-user modal + role
  select + active-switch + delete, but no bulk actions, no inline edit, no key reissue, no
  search/sort/status filter, no pagination).

#### Governance → Agents (`AdminAgentsPage.tsx`, route `/admin/agents`)
- "Every agent, public and private, across every owner" — distinct from Browse (which is
  visibility-scoped) and explicitly cross-links to Deleted Agents for the soft-delete queue.
- Filters: search, category, sort. `data-table`: name, slug, visibility badge, owner
  (name+email), created date, tags. Per-row "Transfer ownership" action expands an inline form
  row (new-owner select + required reason + confirm) rather than a modal.

#### Governance → User Summary (`AdminUserSummaryPage.tsx`, `/admin/user-summary`)
- Same Summary pattern: `StatCard`s (total/active/deactivated/active-without-agents/by-role
  breakdown) → 30-day created/deactivated `TrendChart` → 3 `Leaderboard`s (top agent owners,
  most active reviewers, top account creators). Cross-links back to Users for row actions.

#### Governance → Agent Summary (`AdminAgentSummaryPage.tsx`, `/admin/agent-summary`)
- `StatCard`s (total / with-production / without-production / zero-versions) → **no trend
  chart** (explicit code comment: catalog composition is point-in-time, not event volume; the
  one real time-series, agents-created-per-day, lives on Statistics instead) → two
  `matrix-table`s (by category, by pricing model) → `Leaderboard` (most-used tags).

#### Governance → Deleted Agents (`AdminDeletedAgentsPage.tsx`, `/admin/deleted-agents`)
- **Two independent tables on one page**, each with its own search + pagination:
  1. "Deleted agents" — currently soft-deleted, recoverable; per-row inline "permanently delete"
     form (reason required, irreversible, frees the slug).
  2. "Deletion history" — full event log (soft-delete + hard-delete actions), action badge,
     actor, timestamp, note.
- Cross-links to Deletion Summary for the aggregate view.

#### Governance → Deletion Summary (`AdminDeletionSummaryPage.tsx`, `/admin/deletion-summary`)
- Same Summary pattern: `StatCard`s (pending-hard-delete / total-hard-deleted /
  total-soft-deleted / last-30-days breakdown) → `TrendChart` (soft vs hard, 30 days) →
  `Leaderboard` (top actors by deletion count). Cross-links back to Deleted Agents.

**Governance family relationship, in one line:** every governance domain (Users, Agents,
Deletions) ships as a **pair** — a row-by-row management table (search/filter/paginate/act) plus
a read-only aggregate Summary (stat cards + trend + leaderboard), each explicitly cross-linking
to the other. This pairing is the core pattern to replicate structurally, not just the six pages
individually.

#### Registry group (`/admin/agent-templates`, `/admin/mcp-registry`, `/admin/model-registry`,
`/admin/skillhub-registry` — ~115-130 lines each, near-identical shape per their own code
comments: "Mirrors AdminMcpRegistryPage.tsx / AdminModelRegistryPage.tsx")
- Each is: read-only mirror of an externally-owned catalog (tools/models/skills/templates),
  sync status (last sync time, consecutive-failure count, stale-item list), manual "re-sync now"
  trigger, no create/edit/delete of the underlying entities. This is what I'd bundle as "Registry
  All" under interpretation (a) above — see the confirmation note.

#### Reports → Statistics (`AdminStatsPage.tsx`, `/admin/stats`)
- The one true "overview of everything" page. Sections: **Needs attention** (cards linking out
  to whichever Summary page has the concerning number — agents-without-production, pending
  hard-deletes, deactivated users, each registry's unreachable-sync count), **Overview**
  (agents/versions/users/pending-reviews totals, several linking to their Summary pages),
  **Trends** (agents-created, reviews approved/rejected — 30d), **Usage** (downloads, artifact
  storage, avg rating), **Review governance** (30d approved/rejected/avg score/avg time) +
  2 leaderboards, **Dependency health** (model/skill mirror staleness, linking to Registry pages).
- Effectively aggregates *all* the other Summary pages' headline numbers into one dashboard —
  every `StatCard` that has a `to=` prop deep-links to the page that number came from.

#### Reports → Ops Dashboard (`AdminOpsDashboardPage.tsx`, `/admin/ops-dashboard`)
- Different data domain from Statistics: **execution telemetry**, not catalog/governance stats.
  `refetchInterval: 60_000` (auto-refreshing).
- Row 1: system-health donut (success vs anomaly, 24h), MCP tools `StatCard` (linking to MCP
  registry), "last updated" card.
- Row 2: agents-by-category donut (top-5 + Other), two custom two-metric `stat-card-pair`s
  (connection-failed/timeout; machine-control-access/data-access "high risk" counts), response-
  time-ratio donut (fast/normal/slow).
- Row 3/4: realtime (24h, hourly) and performance (7d, daily) metric rows — 4 sparkline cards
  each (success rate, execution count, token usage, avg response time), same 4 metrics reused
  across both time windows via one `METRIC_CARDS` config mapped twice.
- Uses its own fixed hex-locked category palette (`--ops-*` tokens, validated for
  colorblind-safety per an in-repo dataviz skill script) rather than the general `--brand-*`
  accent — worth reusing verbatim rather than re-deriving.

### Other reference screens (second batch — not in your priority list, scanned for completeness)

| Page | Route | One-line purpose |
|---|---|---|
| `AnnouncementPage` | `/announcement` | Read-only view of the current sitewide announcement |
| `AdminAnnouncementPage` | `/admin/announcement` | Editor for the one announcement `SystemConfig` value |
| `FeatureHistoryPage` | `/feature-history` | Changelog grouped by release version → theme → entry |
| `AgentManagementGuidePage` | `/agent-management` | Static onboarding/policy guide (role hierarchy, lifecycle diagram) |
| `ChecklistDataSimulatorPage` | `/admin/data-simulator` | Test sample agent/version data against the *live* checklist rules |
| `NewRuleSimulatorPage` | `/admin/checklist-simulator` | Draft+preview a *not-yet-saved* checklist rule before creating it |
| `ReviewChecklistItemsPage` | `/review-checklist-items` | CRUD for checklist rule items reviewers use |
| `AdminAgentGraphPage` | `/admin/agent-graph` | WebGL (sigma+graphology) node-link graph of agent/dependency relationships, tiled for scale |
| `AdminAuditLogPage` | `/admin/audit-log` | System-wide append-only action log (agent/user/config/template events) |
| `NewAgentPage` | `/agents/new` | Create-agent form |
| `NewVersionPage` | `/agents/:slug/versions/new` | New version submission form |
| `AgentDetailPage` / `VersionDetailPage` | `/agents/:slug`, `.../versions/:version` | Equivalent to this repo's `AgentDetail`/`VersionDetail`, already implemented here |
| `LoginPage` | `/login` | Equivalent to this repo's `Login`, already implemented here |

---

## 3. Gap list

### Batch 1 — priority screens (per your ordering)

| # | Screen | Status in this repo | Backend support in this repo | Notes |
|---|---|---|---|---|
| 1 | Browse → Agents | **Partial.** `Browse.tsx` exists but is a bare `Segmented` toggle + unpaginated `AgentsTable`. Missing: search, category/tool/model/skill filters, sort, pagination, card-grid layout with description/tags/rating/downloads. | `GET /agents` exists but has no query params for search/category/sort/pagination (`agents.py:49` — plain `list[AgentRead]`, no filters). | Needs both frontend rework and backend query-param support. |
| 2a | Review → Review Queue | **Missing.** `Reviews.tsx` only shows "my reviews," not a reviewer's actionable queue of all pending requests with approve/reject. | Partial — `reviews.py` has `/reviews/mine`, `/reviews/{id}/decision`, but no `/review-requests` list-by-status endpoint the reference page relies on; the whole "review request" concept (vs. this repo's per-version "review" object) may not map 1:1 — needs a data-model check, not just a new page. | Highest-effort item in Batch 1 — likely needs backend design work first. |
| 2b | Review → Review Summary | **Missing entirely.** No aggregate endpoint or page. | Missing — no `/admin/review-summary` equivalent. | New backend endpoint required. |
| 3a | Governance → Users | **Partial.** `AdminUsers.tsx` exists (create/role/status/delete) but lacks: search, role/status filters, sort, pagination, bulk deactivate, inline edit, API-key reissue. | Backend has `POST/GET/PATCH/DELETE /users` — reissue-key endpoint missing; list has no query params. | Extend existing page + existing endpoint, add reissue-key route. |
| 3b | Governance → Agents (all-owners admin view) | **Missing** as a distinct page — `MyAgents.tsx` is owner-scoped only, `Browse.tsx` is visibility-scoped. No ownership-transfer flow anywhere. | `GET /agents` doesn't expose all-owner visibility bypass or transfer-owner action. | New page + new/extended endpoints. |
| 3c | Governance → User Summary | **Missing entirely.** | Missing — no `/admin/user-summary`. | New backend endpoint required. |
| 3d | Governance → Agent Summary | **Missing entirely.** | Missing — no `/admin/agent-summary`. | New backend endpoint required. |
| 3e | Governance → Deleted Agents | **Missing entirely.** `DELETE /agents/{slug}` exists (soft or hard? — worth confirming in the service layer) but no admin recovery/hard-delete/history views. | Missing — no `/admin/deleted-agents`, `/admin/deletion-history`, no hard-delete endpoint. | New backend endpoints + page. |
| 3f | Governance → Deletion Summary | **Missing entirely.** | Missing — no `/admin/deletion-summary`. | New backend endpoint required. |
| 4 | Registry All | **Resolved → interpretation (a).** Bundled overview of Agent Templates / MCP Registry / Model Registry / SkillHub Registry sync status. Nothing exists today. | Missing — no equivalent of the reference repo's four per-source status endpoints. | In scope for this round, Option A (real endpoints). |
| 5a | Reports → Statistics | **Missing entirely.** | Missing — no `/admin/stats`. | New backend endpoint required; depends on 3c/3d/3f existing first for the same cross-linking pattern. In scope for this round. |
| 5b | Reports → Ops Dashboard | **Deferred — out of this round.** No execution-telemetry concept appears anywhere in this repo's data model (no execution logs, no token-usage tracking). | Missing — needs a new data domain (agent *execution* telemetry), not just a new endpoint, unlike every other gap above which aggregates data that already exists. | **Split out for separate scoping discussion** before it's scheduled into any Phase 3 build order. |

### Batch 2 — other gaps (lower priority, for completeness)

Missing entirely, no equivalent in this repo: Announcement (view + admin editor), Feature
History, Agent Management Guide, Checklist Data/Rule Simulators, Review Checklist Items CRUD,
Agent Graph (dependency visualization), Audit Log. None of these were requested in your priority
list — listed here only so the full gap surface is visible.

### Existing-screen staleness flags

- `Browse.tsx` — functionally thin relative to its reference counterpart (see Batch 1 #1); not
  "broken," just missing the filter/pagination/card affordances that make the reference version
  usable at catalog scale.
- `AdminUsers.tsx` — same story as Users above; works for small user counts, has no
  answer for search/bulk ops at scale.
- No page in this repo is visually "outdated" in the sense of using deprecated patterns — the
  problem is closer to the opposite: everything is built directly on raw antd defaults with zero
  shared tokens (§1), so there's no established visual language yet to age out of. Phase 2's
  design system is greenfield, not a migration off something old.

---

## 4. Cross-cutting finding: backend gap, not just frontend

Every Batch 1 item flagged "Missing entirely" above is missing **on the backend**, not just as
a UI screen — this repo's FastAPI backend (`backend/app/api/v1/endpoints/`: `agents`,
`agent_versions`, `auth`, `dependencies`, `mcps`, `reviews`, `skills`, `users`) has no
`admin/*` namespace at all (reference repo's Express backend has a dedicated set of
`/admin/*` aggregate + governance routes backing every Summary/Governance/Reports page). Phase 3
as scoped ("直接把缺的畫面做出來" / "用 tokens 套用視覺") will need real backend endpoints under
most of these pages before there's data to render — this goes beyond a frontend-only design-system
exercise for at least items 2a, 2b, 3c, 3d, 3e, 3f, 5a, 5b. Worth deciding up front whether Phase
3 includes backend work or ships these pages against mocked/stubbed data first.

---

## Decisions (resolved 2026-08-10)

1. **"Registry All" scope → interpretation (a).** Item 4 in the priority list means the
   reference repo's "Registry" sidebar group: Agent Templates, MCP Registry, Model Registry,
   SkillHub Registry — read-only mirrors of externally-owned catalogs, each with sync status
   and a manual re-sync trigger. Distinct from Governance → Agents (item 3b, this system's own
   agent records).
2. **Backend scope for Phase 3 → Option A** (build the missing `/admin/*` backend endpoint
   alongside each screen, not mock data) for every Batch 1 item **except** Reports → Ops
   Dashboard.
3. **Ops Dashboard (5b) is split out of this round.** It needs a new execution-telemetry data
   domain (success rate, token usage, response time per agent run) that doesn't exist anywhere
   in this repo's schema today — that's a data-model decision, not a screen-building task, and
   will be scoped separately before it's scheduled. Phase 3's build order below ends at Reports →
   Statistics; Ops Dashboard is deferred pending that separate discussion.

### Revised Phase 3 build order

1. Browse → Agents (extend `Browse.tsx` + add query params to `GET /agents`)
2. Review → Review Queue → Review Summary (new `/admin/review-summary` endpoint; Review Queue
   needs a data-model check first — see Batch 1 table, this repo's "review" object may not map
   1:1 onto the reference's "review request" concept)
3. Governance → Users → Agents → User Summary → Agent Summary → Deleted Agents → Deletion Summary
   (new `/admin/user-summary`, `/admin/agent-summary`, `/admin/deleted-agents`,
   `/admin/deletion-history`, `/admin/deletion-summary`, hard-delete + transfer-owner + reissue-key
   endpoints, as itemized in Batch 1)
4. Registry All — bundled overview of Agent Templates / MCP Registry / Model Registry / SkillHub
   Registry sync status (new page; reference repo's four existing endpoints per source show what
   data is available to bundle)
5. Reports → Statistics (new `/admin/stats` endpoint, aggregating the summary endpoints built in
   step 3)

**Deferred, separate discussion:** Reports → Ops Dashboard (needs execution-telemetry schema
design first).
