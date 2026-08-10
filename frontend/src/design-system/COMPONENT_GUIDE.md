# Component style guide — proposal companion to `tokens.proposal.css`

Status: proposal, paired with `tokens.proposal.css`. Describes how the tokens should be
applied once approved — not describing anything currently on screen.

---

## Dense data tables

The single most-used surface in this tool (Browse, Review Queue, every Governance list) —
gets the most explicit rules.

- Row height: `--table-row-height` (34px), not the generic 40–48px "compact/default" a
  typical admin-table spec would suggest. Justification: this tool's own stated priority is
  information density over comfort; 34px fits ~4 more rows per screen than 40px at this
  tool's default `--text-sm` (13px) cell text without feeling cramped.
  - **Exception**: tables whose rows carry a two-line primary cell (e.g. name + slug stacked,
    as `AgentsTable.tsx` already does) may grow to content height — don't force-clip a
    genuinely two-line cell into 34px, just don't pad a single-line cell out to match one that
    has a subtitle.
- Header: `--table-header-bg` / `--table-header-fg`, `--text-2xs`, uppercase, `0.02em`
  letter-spacing — label only, never interactive-looking (no sort-arrow chrome unless a
  column is actually sortable).
- Zebra stripe (`--table-stripe-bg`) on `tbody tr:nth-child(even)`, hover (`--table-hover-bg`)
  layered on top and always wins regardless of stripe parity — same ordering rule the
  reference repo validated (declare stripe first, hover second).
- Numeric/count columns right-align; status/badge columns center; the row-actions column is
  always the rightmost, fixed-width, icon-only buttons with a `title` tooltip (matches this
  app's existing icon-button convention in `AdminUsers.tsx`/`AgentDetail.tsx` — keep it).
- Row-level destructive or multi-field actions (transfer owner, permanent delete, approve/
  reject with a reason) expand as a full-width row directly below the record rather than a
  modal — this is a deliberate reuse of the reference repo's pattern (see
  `AdminAgentsPage.tsx`'s transfer flow in UI_AUDIT.md §2), not a modal, because it keeps the
  admin's place in a long table instead of yanking focus into an overlay.
- IDs, slugs, and API keys render in `--font-mono` — never the default sans — anywhere they
  appear in a table cell.

## Forms / filter bars

- Every text input, select, and button in a filter bar shares `--input-height` /
  `--button-height` (both 32px) so a row of mixed controls lines up on one baseline without
  hand-tuned padding per control — this app's current filter-adjacent UI doesn't have this
  problem yet only because most filter bars don't exist yet (see UI_AUDIT.md Batch 1).
- Labels sit above their input, `--text-xs`, `--fg-muted` — never inline-left labels (those
  don't scale to a dense multi-filter row).
- Focus state: `--input-focus-ring` as a 2px outline, offset −1px (outline sits just inside
  the border, doesn't shift layout) — same technique as the reference repo, kept because it's
  a correctness property (visible focus without reflow), not a stylistic choice.
- A required-reason text field (approve/reject, transfer, hard-delete — all through this
  tool per the reference repo's pattern) is never a bare unlabeled input; always paired with
  placeholder text stating it's required, and the submit button stays disabled/no-ops until
  non-empty — client-side mirror of what the backend will reject anyway.

## Status badges / tags

- Default treatment is **outlined**: `border-color` and `color` both set to the same
  `--status-*-fg`/`--status-*-border` pair, transparent fill. This keeps a table readable at
  a glance without every cell competing in saturated color — the badge reads as a label, not
  a highlight.
- Exactly one state per domain gets the **solid** treatment (filled `--status-success-solid-bg`,
  white text): the "this is the one that matters" state — `active`/`production` for versions,
  `approved` for review decisions. Every other state (draft, pending, staging, rejected,
  archived) stays outlined. Don't solid-fill more than one state per badge family — it defeats
  the point of having a "this one stands out" signal.
- Shape: `--badge-radius` full pill, `--text-2xs`, uppercase, `0.02em` tracking — no wrapping
  ever (`white-space: nowrap`); a two-word status like "permanently deleted" must still read
  as one pill, not wrap and stretch its row.
- Neutral/disabled-feeling states (draft, archived, deactivated) use `--status-neutral-*`
  plus reduced opacity on the whole badge rather than a distinct hue — a muted gray badge with
  no border-color meaning reads as "inactive" without inventing a 5th color.

## Cards / stat cards

- Plain content card: `--card-bg`, `--card-border`, `--card-radius`, `--card-shadow` (barely
  visible — `--p-shadow-xs`); on hover only if the whole card is a click target
  (`--card-shadow-hover` + border shifts to `--color-brand-tint`'s border weight), never on a
  static card.
- Stat card (every Summary page, Statistics, Ops Dashboard): value at `--stat-value-size`
  (28px) bold, label below at `--stat-label-size` (12px) `--fg-muted`, optional one-line
  breakdown at the same size one step lighter. `--stat-min-height` keeps a row of stat cards
  aligned even when only some of them carry a breakdown line — center the content vertically
  inside that minimum height rather than anchoring to the top, so the empty space under a
  shorter card reads as intentional, not broken.
- A stat card that deep-links to its source page (Statistics → Agent Summary, etc.) is still
  a plain card visually — the link affordance is the whole card being clickable
  (cursor + hover shadow), not an icon or "View more" label competing with the number.

## Cross-cutting rule

Nothing in a screen should reference a `--p-*` primitive directly — always go through the
semantic layer (`--bg-*`, `--fg-*`, `--status-*`, `--chart-*`) or a component token. The
primitive layer only exists so the semantic layer has something to point at; changing a
primitive value (retuning the brand ramp, say) should never require touching component CSS.

---

## Open implementation question: does this replace Ant Design, or skin it?

This repo's existing 10 screens are built entirely on Ant Design components (`Table`, `Form`,
`Modal`, `Select`, `Popconfirm`, …) styled via inline `style={{}}` overrides. The tokens above
are plain CSS custom properties, which is how the reference repo works — but the reference
repo has **no UI kit at all**, everything is hand-rolled semantic HTML + these variables. This
app has antd already wired in, with real value (accessible `Modal`/`Select`/`Form` validation/
`Popconfirm` for free). Three ways to reconcile that before Phase 3 starts building screens:

1. **Keep antd everywhere**, map these tokens into antd's `ConfigProvider theme` (`token:` /
   `algorithm:` overrides) instead of hand-rolled CSS. Lowest risk, reuses antd's existing
   form/overlay components as-is. Risk: antd's `Table` theming API doesn't give the same
   direct control over row height/zebra-stripe/hover this guide specifies above — matching
   34px dense rows through antd's theme tokens is possible but fights the grain more than
   writing the CSS directly.
2. **Drop antd for new screens**, hand-roll with semantic HTML + these tokens, matching the
   reference repo's approach exactly (and this guide's table/form rules were written assuming
   that). Best fit for the density goal. Cost: loses antd's ready-made `Modal`/`Select`/
   `DatePicker`/form-validation for every new screen, which means Phase 5 ("unify shared
   components") has to build a small hand-rolled kit up front rather than at the end.
3. **Hybrid** — hand-roll the data-dense surfaces this guide covers above (tables, badges,
   stat cards, filter bars, since that's where density actually lives) styled by these
   tokens, and keep antd — themed via `ConfigProvider` from the same tokens — for complex
   overlay components (`Modal`, `Select`, `DatePicker`, `Popconfirm`) so those don't look
   foreign sitting next to hand-rolled surfaces.

**Decided (2026-08-10): option 3 (hybrid).** Data-dense surfaces (tables, badges, stat cards,
filter bars) are hand-rolled semantic HTML styled by these tokens; `Modal`, `Select`,
`DatePicker`, and `Popconfirm` stay on antd, themed via `ConfigProvider` from the same token
values (map `--color-brand`/`--border-default`/`--p-radius-sm`/etc. into antd's `token:`
overrides) so they read as one system rather than two. Phase 3 screens should default to plain
HTML/CSS for anything this guide covers above, and reach for the themed antd components only
for the specific overlay/complex-input cases they're good at.
