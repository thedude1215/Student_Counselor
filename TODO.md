# ScholarPath — Build Roadmap

Inspired by borderless.so. Tracks the path from static prototype to a real product with accounts, a database, and an AI counselor.

## Phase 0 — Logos ✅ done
- [x] Remove dead logo files (failed downloads saved as `.png`, actually HTML)
- [x] Replace blurry favicon-quality logos (NYU, NUS, Edinburgh, Toronto, Vanderbilt) with crisp SVG badges
- [x] Add missing NTU entry (homepage logo strip + university catalog)
- [ ] Swap in official university wordmark/seal art if/when available (drop files into `public/logos/`, ping Claude to wire them up)

## Phase 1 — Backend foundation (Supabase) ✅ done
- [x] Create Supabase project (qfmiilxytmccuihbyvga, ap-northeast-1)
- [x] Design schema: `profiles`, `universities`, `programs`, `stories`, `acceptances`, `college_list_items`, `tasks`, `essays`, `chat_messages`
- [x] Write Row-Level Security policies so each user only sees their own data
- [x] Auto-create `profiles` row on signup (database trigger)
- [x] Migrate static `shared/data/*` catalog content into Supabase tables (13 universities, 12 programs, 8 stories, 12 acceptances)
- [x] Install `@supabase/supabase-js` and create client (`src/lib/supabase.js`)
- [x] Rewire Universities, Programs, Stories, Acceptances pages to fetch from Supabase
- [x] Add loading states to all data-backed pages

## Phase 2 — Auth & accounts ✅ done
- [x] Supabase Auth wired into React (sign up / log in / log out)
- [x] Google OAuth enabled (provider configured in dashboard; "Continue with Google" works)
- [x] Email confirmation turned OFF (instant login after signup)
- [x] Session context (`src/context/AuthContext.jsx`) + protected `/dashboard` route
- [x] Navbar shows Log in / Dashboard + sign-out based on auth state
- [x] Starter Dashboard page (`/dashboard`) — real workspace cards come in Phase 4
- [x] Auto-create a `profiles` row on signup (done in Phase 1 via DB trigger)
- [x] Verified end-to-end: signup → login → dashboard → sign-out → route guard

Note: productivity `dashboard.html` was renamed to `productivity-dashboard.html` so it
stops shadowing the React `/dashboard` route in Vite.

## Phase 3 — AI counselor (Nova) ✅ done
- [x] Move AI calls server-side (Express proxy to Gemini Flash — $0 free tier)
- [x] Persist chat history per user in `chat_messages` with conversation management
- [x] Add AI essay review (structured feedback, stored per essay)
- [x] Add AI college-list recommendations grounded in student's profile
- [x] Auth gate on Nova page (requires login)
- [x] Conversation history sidebar (list/create/delete)

## Phase 3.5 — Advanced AI agent
- [x] Gemini function calling — 8 tools (search_universities, search_programs, search_stories, get_student_profile, get_college_list, get_upcoming_tasks, compare_universities, add_to_college_list)
- [x] pgvector embeddings — semantic search via Gemini text-embedding-004 + Supabase pgvector
- [x] Supabase RPC functions for similarity search (match_universities, match_programs, match_stories)
- [x] Python LangGraph service (FastAPI + ReAct agent) at `nova-agent/`
- [ ] Wire Express to proxy chat to Python service (currently both work independently)
- [ ] Run embed-catalog backfill script (needs SUPABASE_SERVICE_ROLE_KEY)
- [ ] SSE streaming from Python → Express → React
- [ ] LangGraph workflow subgraphs (college list builder, strategy review, deadline prep)

## Phase 4 — Core features on real data ✅ done
- [x] College list builder: add from Universities page, reach/match/likely tagging, remove
- [x] Task manager + deadline tracker: add/complete/delete, due dates, priority, sorted, overdue flag
- [x] Essay workspace: list + editor, drafts, word count, save/delete (AI feedback hooks in Phase 3)
- [x] Workspace shell with sidebar (Overview / College List / Tasks / Essays) at `/dashboard/*`
- [x] Overview dashboard: live counts + "next up" task, pulls everything together
- [x] Nudges (homepage promise "Nudges you before things slip"): in-app proactive reminders on the Overview, derived from real data (`src/lib/nudges.js`) — overdue tasks, deadlines within 7 days, list-balance, essay nudges. Email/WhatsApp delivery deferred to Phase 5 (needs cron + Twilio/Resend).
- [x] Data layer `src/api/workspace.js` (CRUD against Supabase, all RLS-scoped)
- [x] Verified end-to-end: add schools → tier change → tasks → complete → essays → overview

## Phase 4.5 — Borderless-style workspace ✅ done
- [x] Profile page (`/dashboard/profile`): GPA, SAT, IELTS, grade, class year, intended major, budget, target countries, interests, goals → saved to `profiles`
- [x] "On track" status card on Overview: readiness % + progress bar + tags (class/target/major) + computed summary (`src/lib/readiness.js`)
- [x] Today / This week task grouping on Overview (with inline complete)
- [x] Kanban task board (`/dashboard/tasks`): To do / In review / Done columns, drag-and-drop, category tags (`tasks.category`)
- [x] Calendar (`/dashboard/calendar`): month grid with deadline markers + upcoming list
- [x] Activities & Honors (`/dashboard/activities`): extracurriculars + awards, new `activities` + `honors` tables w/ RLS
- [x] DB migration `phase4_borderless_upgrades` (3 profile cols, tasks.category, 2 tables + 8 RLS policies)
- [x] Sidebar nav expanded: Overview, Profile, College List, Essays, Activities, Tasks, Calendar
- Note: verified via clean `npm run build` + schema checks + unit-tested logic; live preview tooling was blocked this session by stale dev servers — view on your own dev server.

## Phase 5 — Polish & ship
- [ ] Replace remaining placeholder SVG logos with official art
- [ ] Mobile responsiveness pass
- [ ] Deploy (Vercel) + environment variables configured
- [ ] Basic error/loading states across all data-backed pages

---
**Next up:** Add SUPABASE_SERVICE_ROLE_KEY to `.env`, run embedding backfill, wire Express→Python proxy. Then Phase 5 polish.
