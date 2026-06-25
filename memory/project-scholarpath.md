---
name: project-scholarpath
description: ScholarPath product context — stack, architecture, current phase, and build roadmap
metadata:
  type: project
---

Solo-founder project by Arnav. AI-powered college counseling for international students, inspired by borderless.so.

**Why:** International students lack access to college counselors. ScholarPath + Nova fills that gap with AI.

**How to apply:** All work should move toward the phased roadmap in TODO.md.

## Current Stack
- Frontend: React 19 + Vite 8 + React Router 7
- Backend: Supabase (Postgres + Auth). Project ref: `qfmiilxytmccuihbyvga` (region ap-northeast-1)
- Supabase client: `src/lib/supabase.js`; catalog fetches in `src/api/catalog.js`
- Auth: `src/context/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/pages/Auth.jsx`, `src/pages/Dashboard.jsx`
- Legacy Express API in `server/` is no longer used by the frontend (kept for reference)

## Supabase config notes
- Email confirmation is OFF (instant login after signup)
- Google OAuth is enabled (provider configured in dashboard)
- DB trigger `handle_new_user` auto-creates a `profiles` row on signup
- RLS: public catalog tables readable by all; user tables scoped by `auth.uid()`

## Nova AI (Phase 3) config
- AI provider is Google Gemini (NOT Anthropic). Server: `server/services/aiService.js`, route `server/routes/novaRoutes.js`, client `src/api/nova.js`
- Model MUST be `gemini-2.5-flash` — `gemini-2.0-flash` returns `limit: 0` (no free quota on this account)
- Express server runs on :8787 via `npm run server` (`node --env-file=.env`); Vite proxies `/api` → 8787
- `.env` keys: `GEMINI_API_KEY` + `VITE_GEMINI_API_KEY` (Gemini, `AQ.Ab8…` format), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (JWT). `.env` is gitignored.
- Nova server validates the user's Supabase JWT in `server/middleware/auth.js` using the service-role client — if `SUPABASE_SERVICE_ROLE_KEY` is missing it falls back to a placeholder and every call fails with "Invalid or expired token"

## Gotcha
- The productivity tool file is `productivity-dashboard.html` (renamed from `dashboard.html`
  because `dashboard.html` in the project root was shadowing the React `/dashboard` route in Vite)
- After editing `.env` or server code, restart the Express server (`npm run server`) — it does not hot-reload

## Roadmap (from TODO.md)
- Phase 0: Logos — done
- Phase 1: Supabase backend — done (8 tables, RLS, catalog seeded, pages wired)
- Phase 2: Auth & accounts — done (email/password + Google OAuth, protected routes)
- Phase 4: Core features — done (college list, tasks, essays, overview at `/dashboard/*`; data layer `src/api/workspace.js`)
- Phase 4.5: Borderless-style workspace — done. Routes under `/dashboard/*`: profile, colleges, essays, activities, tasks (kanban w/ drag-drop), calendar. Helpers: `src/lib/readiness.js` (status card), `src/lib/nudges.js`. Tables added: `activities`, `honors`; cols added: profiles.{intended_major,class_year,ielts_score}, tasks.category
- Phase 3: Nova AI counselor (Anthropic API) — **next, blocked on Anthropic API key**
- Phase 5: Polish & deploy

Related: [[glossary]]
