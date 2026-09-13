# Project Agent Rules — CivicLedger

> **Project:** CivicLedger — Sistem Laporan Infrastruktur & Lingkungan Kota (Smart City Civic Tech)  
> **Status:** ALWAYS ACTIVE for all conversations and subagents in this workspace.  
> **Skill Activation:** Skills documented here MUST be automatically triggered without requiring explicit user invocation.

---

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

---

## 🚀 Project Tech Stack & Architecture

- **Frontend Core**: React 18 + Vite (SPA)
- **Language**: TypeScript (Strict Mode, 0 `any` policy)
- **Styling & Animation**: Tailwind CSS, Framer Motion, Custom CSS Glassmorphism/Tokens
- **Mapping & Geolocation**: Leaflet + React-Leaflet, OpenStreetMap Tiles, Browser Geolocation API
- **Charts & Data Viz**: Recharts
- **Icons**: Lucide React
- **Backend & BaaS**: Supabase (PostgreSQL, Row Level Security / RLS, Auth, Storage, Realtime Subscriptions, RPC Functions)
- **Target Roles**: 
  1. *Masyarakat (Warga)*: Create reports with photo/map, track status, upvote, comment.
  2. *Admin*: Verify/reject reports, assign to field officers, manage regions & officers, view analytics.
  3. *Petugas Lapangan (`/petugas`)*: Mobile-first PWA interface, navigation deep link, task status updater with photo proof.

---

## ⚡ Universal Skills Auto-Invocation (ACTIVE ON EVERY PROMPT)

Every agent working in this repo MUST automatically trigger and strictly adhere to all relevant skills on **EVERY USER PROMPT** without requiring explicit invocation:

| Task Domain | Mandatory Skills | Auto-Trigger Conditions |
|---|---|---|
| **Universal Baseline** | `full-output-enforcement`, `ponytail`, `verification-before-completion` | Active on EVERY prompt. Full code output without placeholders, minimal direct code, mandatory lint/build evidence before completion claims. |
| **UI / UX / Styling** | `impeccable`, `design-taste-frontend`, `high-end-visual-design`, `stitch-design-taste`, `minimalist-ui` | Any modification or creation of components, layouts, maps, mobile officer view, forms, badges, modals, charts. Enforce anti-slop, high contrast, clean typography, responsive design. |
| **Code Efficiency** | `ponytail`, `full-output-enforcement` | Any code implementation. Enforce minimal working solution, YAGNI, standard browser APIs, no unnecessary dependencies, complete unabridged output. |
| **Token Optimization** | `caveman`, `cavecrew` | Subagent outputs, summaries, PR/code reviews, commit messages (`caveman-commit`). |
| **Planning & Design** | `brainstorming`, `writing-plans`, `executing-plans`, `using-superpowers` | Any new feature, multi-step refactor, database schema change, or architectural decision. |
| **Debugging & QA** | `systematic-debugging`, `verification-before-completion`, `test-driven-development` | Any bug fix, runtime error, build/lint failure, or before declaring a task complete. Verify evidence first. |
| **Parallel Execution** | `dispatching-parallel-agents`, `subagent-driven-development`, `cavecrew` | Whenever 2+ independent tasks exist (e.g. Supabase DB vs UI Component vs Map integration vs Hooks). |
| **Safety & Integrity** | `accidental-data-loss-prevention` | Supabase migrations, table/column drops, destructive shell commands, bulk file deletions. |

---

## 🤖 Parallel Subagents Execution Protocol

When handling complex or multi-part tasks, **parallel subagents MUST be utilized properly to maximize speed and isolate context**:

### 1. When to Dispatch Parallel Subagents
- **Multi-domain Implementation**: When a feature spans independent layers (e.g. Subagent 1: Supabase RLS/Schema, Subagent 2: Leaflet Map logic, Subagent 3: UI page & components).
- **Parallel Code Audits / Investigations**: When inspecting multiple independent directories or debugging unrelated errors across different files.
- **Concurrent Feature Development**: Implementing independent pages (e.g. `/petugas` mobile view vs Admin analytics).

### 2. Parallel Dispatch Rules (Single-Turn Dispatch)
- **Simultaneous Invocation**: Call multiple subagent tools in the **SAME turn** so they execute concurrently.
- **Domain Isolation**: Each subagent gets 1 specific problem domain and explicit file boundaries. No two subagents should edit the exact same file simultaneously.
- **Self-Contained Prompts**: Provide all necessary types, schema definitions, and constraints directly in the subagent prompt.
- **Terse / Compressed Contract (`cavecrew`)**: Require subagents to return compact summaries (`cavecrew-builder` / `cavecrew-investigator` format) to prevent context pollution in the parent coordinator.

### 3. Parent Coordinator Responsibilities
1. Define the task breakdown and file ownership before dispatching.
2. Dispatch subagents simultaneously in one response.
3. Review returned diffs/summaries from all subagents.
4. Resolve any integration glue or boundary conditions.
5. Run full verification (`npm run lint`, `npm run build`) before confirming completion.

---

## 🎨 UI/UX & Design Standards (Civic Tech)

- **Anti-Generic AI Look**: Avoid default tailwind templates, flat blue buttons, and generic card spam.
- **Civic Tech Palette**: Deep slate/charcoal backgrounds or clean crisp cards, warm amber/gold highlights (`#D4A843` or civic accent), emerald green for resolved/verified states, crimson for urgent/danger alerts.
- **Mobile-First Petugas Experience**: Big tap targets, high contrast for outdoor daylight readability, minimal text clutter, instant GPS navigation triggers.
- **Accessible & Informative**: Clear state indicators (`Menunggu Verifikasi`, `Terverifikasi`, `Ditugaskan`, `Diproses`, `Selesai`, `Ditolak`), radius duplicate detection alerts, interactive Leaflet cluster markers.

---

## 🔒 Verification & Quality Rules

1. **Evidence Before Assertions**: Never claim code works without running `npm run lint` and verifying build output.
2. **Strict Typing**: Zero `any` types. All Supabase query results and component props must be typed in `src/types/`.
3. **Commit Messages**: Follow Conventional Commits format (`feat:`, `fix:`, `refactor:`, `style:`, `chore:`), subject ≤ 50 chars.
