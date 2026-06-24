# Tasks

## In Progress
- [ ] Swap in official university wordmark/seal art when available (Phase 0 remaining)

## Blocked
- [ ] Create Supabase project, get URL + anon key + service role key (Phase 1)
- [ ] Get Anthropic API key for Nova (Phase 3)

## Upcoming — Phase 1: Backend
- [ ] Design schema: profiles, universities, programs, college_list_items, tasks, deadlines, essays, chat_messages
- [ ] Write RLS policies (each user sees only their own data)
- [ ] Migrate static shared/data/* catalog into Supabase tables

## Upcoming — Phase 2: Auth
- [ ] Supabase Auth in React (sign up / log in / log out)
- [ ] Session context + protected dashboard routes
- [ ] Auto-create profiles row on signup

## Upcoming — Phase 3: Nova AI
- [ ] AI calls server-side (Express or Edge Function)
- [ ] Persist chat history per user in chat_messages
- [ ] AI essay review (line-by-line feedback per draft)
- [ ] AI college-list recommendations grounded in student profile

## Upcoming — Phase 4: Core Features
- [ ] College list builder (save/remove, reach/match/likely)
- [ ] Deadline tracker (test dates, apps, supplements)
- [ ] Task manager (weekly to-dos, due dates, status)
- [ ] Essay workspace (drafts, versions, AI feedback inline)
- [ ] Dashboard (unified home view)

## Upcoming — Phase 5: Polish & Ship
- [ ] Replace remaining placeholder logos
- [ ] Mobile responsiveness pass
- [ ] Deploy to Vercel + env vars configured
- [ ] Error/loading states across all data-backed pages

## Done
- [x] Phase 0 logos — removed dead files, replaced blurry logos with SVGs, added NTU
- [x] React + Vite frontend (Home, Universities, Programs, Stories, Acceptances, Nova)
- [x] Express API with catalog routes
- [x] LogoTile component with fallback
- [x] Infinite marquee, WhatsApp mockup, workspace mockup on Home
