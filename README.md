# ApexEvolve — V264 Lean Pilot (Expensive Methods)

Interactive prototype for engineering review.  An additive V264-shaped UX for integrating **ApexEvolve** into the existing **ApexGuru Insights → Expensive Methods** page.

> **⚡ ApexEvolve doesn't just rewrite — it proves.**
> Evolved, benchmarked, and reasoned across CPU, SOQL, heap, and bulk-safety dimensions. Not a suggestion. A proof.

---

## What this prototype is

This is a React + Vite prototype of the **lean pilot build** of ApexEvolve integrated into the real ApexGuru Insights Setup page. It's designed to:

1. Demonstrate the user flow for DF'27 pilot (Bajaj Finance, etc.) with **no runtime polling** and a **static ETA** — the minimal UX change set engineering needs to build.
2. Let engineering clone, run, and propose changes before 264 sprint kickoff.
3. Show two reference scenarios (A: Salesforce-managed environment, B: Customer-connected sandbox) plus the new V264 lean view — all in one app.

**The V264 view is the default landing view** (sidebar: **RELEASE → 264 Version**). The original A/B demo scenarios live under **DEMO SCENARIO** in the sidebar for reference.

---

## Quick start

**Requirements:** Node.js 20+ and npm.

```bash
git clone <this-repo>
cd apexevolve-v264-pilot
npm install
npm run dev
```

Then open `http://localhost:5173/apexevolve-expensive-methods-prototype/` (Vite will pick an available port; check the terminal output).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server with HMR |
| `npm run build` | Production build into `dist/` (uses default base path) |
| `npm run build:soma` | Build for git.soma Pages (`/pages/mayuresh-verma/apexevolve-v264-pilot/`) |
| `npm run build:public` | Build for public GitHub Pages (`/apexevolve-expensive-methods-prototype/`) |
| `npm run preview` | Preview a production build locally |
| `npm run lint` | ESLint pass |

### Redeploying the live demo (PM workflow)

After pushing source changes to `main`, deploy the built site to the `gh-pages` branch:

```bash
# Build with the correct base path for the target
npm run build:soma

# Deploy to git.soma Pages (use a fresh clone to avoid worktree conflicts)
cd /tmp && rm -rf apexevolve-ghpages && \
  git clone -b gh-pages https://git.soma.salesforce.com/mayuresh-verma/apexevolve-v264-pilot.git apexevolve-ghpages
cd apexevolve-ghpages
find . -mindepth 1 -not -path './.git*' -delete
cp -R <path-to-prototype>/dist/* .
git add -A && git commit -m "Redeploy V264" && git push origin gh-pages
```

git.soma Pages rebuilds in ~30-60 seconds after push.

---

## Demo flow for reviewers

1. **Land on 264 Version (default)** — see the page-level "NEW" callout banner above the tabs and the action bar at the top of Expensive Methods
2. **Click "Optimize All Recommended Methods with ApexEvolve"** (5 methods auto-selected)
3. **Confirmation modal** — ETA (static, ~10 min shown as a bar), 6 customer-facing caveats sourced from #apex-evolve
4. **Click Start** → 15-second demo run (real product ETA is ~10 min)
5. **"Ready" state** → recommendations section appears above the method list with collapsible cards
6. **Expand a card** — default tab is **Code comparison**, then **Scores**, then **Why this change** (the Proof Panel with verdict + dot-rated dimensions + before-you-apply caveats)
7. **Click "View full analysis"** — opens a modal with the full markdown rationale (Apex-specific, governor-limit-aware, modelled on Wenzhuo's real CodeEvolve output)
8. **Click "Download PDF"** at the top right — consolidated PDF with Proof Panel + Scores + Code + Full Analysis per method
9. **Refresh the page** — recommendations persist via localStorage (30-day TTL) and the "Optimized MMM DD" chip appears on the list rows
10. **Click "Re-evolve" on any existing card** — opens the confirmation modal with amber context banner explaining the refresh

---

## What's in this prototype vs. out of scope for pilot

See [`ScenarioMatrix.md`](../ScenarioMatrix.md) in the parent folder (if browsing locally) for the full ~65-scenario engineering-facing specification. Key status markers:

| Marker | Meaning |
|---|---|
| ✅ | Demonstrated in prototype |
| 🔧 | Engineering decision needed (PM has a recommendation) |
| ⚠️ | Explicitly out of pilot scope |

### Highlights of what eng needs to decide (🔧)

- Backend run-state persistence (client-only is brittle)
- Failure / timeout UX + retry affordance
- Concurrent-run queue model per org
- Partial-success result payload shape
- PDF Table-of-Contents implementation
- Engine-version-upgrade detection
- Feature-flag wiring
- a11y pass (required before GA)
- Copy-code action on the Optimized block (small, recommend for pilot)
- Semantic Score < 1.00 warning surface (trust-critical)

---

## Key files

| Path | What it contains |
|---|---|
| `src/App.jsx` | Top-level routing: A/B demo ↔ V264 view |
| `src/components/V264View.jsx` | V264 page layout — action bar, recommendations section, method list, status bar, modals |
| `src/components/V264RecommendationCard.jsx` | Collapsible per-method card with 3 sub-tabs |
| `src/components/V264FullAnalysisModal.jsx` | "View full analysis" modal (markdown rendering with remark-gfm) |
| `src/data/optimizationReports.js` | Per-method reports — verdict, Proof Panel sections, code, long-form narrative |
| `src/context/AppContext.jsx` | State management + localStorage persistence (30-day TTL) |
| `src/utils/pdfGenerator.js` | Consolidated PDF generation via jsPDF |

---

## Design principles used in this pilot build

1. **Build on existing UX, don't replace it** — V264 sits on top of the real ApexGuru Setup page skin (white card, SLDS tabs, standard trust banner) and adds only what's needed for the pilot.
2. **No runtime polling** — static ETA shown as a bar. Real product expects ~10 minutes. Demo resolves in 15 seconds for review convenience.
3. **Persistence, not re-run** — optimized methods cache for 30 days in localStorage. Re-evolve is an explicit user opt-in, not a forced re-run.
4. **Consolidated single PDF** — one "Download PDF" at the top covers all persisted recommendations. No per-card PDFs. Matches existing ApexGuru pattern.
5. **Proof Panel over narrative** — condensed dimensional summary (verdict + numbered What Changed + dot-rated Why It Matters + before-you-apply caveats) as the default. Long-form markdown available via "View full analysis" link.
6. **The USP is the rationale** — ApexEvolve's differentiation vs. Cursor / Copilot / Claude Code is the governor-limit-aware, multi-dimensional proof it produces. The Proof Panel surfaces this directly.

---

## Where the optimization rationales come from

The per-method `report.md`-style narratives in `src/data/optimizationReports.js` are hand-authored for the demo, modelled directly on the real CodeEvolve backend output:

- Reference: `git.soma.salesforce.com/wenzhuo-yang/CodeEvolve/tree/master/applications/apex/samples/comparison/b2b/expensive/` — structured `report.md` files with verdict tables, CPU comparisons, SOQL analysis, heap pressure discussion, semantic equivalence.
- In production, these come from `ApexSummarizer.generate_summary()` — see `applications/apex/summarizer.py` in the CodeEvolve repo.

---

## Feedback & PRs

- **PRs:** open against `main`. Will route to CODEOWNERS for review.
- **Issues:** use this repo's issue tracker for feature asks, UX nits, or eng questions.
- **PM contact:** Mayuresh Verma (`@mayuresh-verma`).

---

**Build:** 264 · **Pilot customer:** Bajaj Finance (DF'27) · **Status:** Pre-eng-review
