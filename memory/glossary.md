---
name: glossary
description: Decoder ring for ScholarPath shorthand — product terms, acronyms, and naming conventions
metadata:
  type: reference
---

## Product
| Term | Meaning |
|------|---------|
| ScholarPath | The product — AI college counseling platform for international students |
| Nova | AI counselor chatbot inside ScholarPath |
| Borderless | borderless.so — design/feature inspiration |
| catalog | Public-facing data: universities, programs, stories, acceptances |
| workspace | The logged-in dashboard view (college list + essays + tasks + chat) |

## Technical
| Term | Meaning |
|------|---------|
| HQ logos | High-quality PNG logos in `public/logos/` (e.g. `yale-hq.png`) |
| anon key | Supabase public API key (safe for client-side) |
| service role key | Supabase admin key (server-side only, never expose) |
| RLS | Row-Level Security — Postgres/Supabase row-scoping per user |
| catalog routes | Express routes under `/api` serving universities, programs, stories, acceptances |

## Shorthand
| Phrase | Means |
|--------|-------|
| "ping Claude to wire them up" | Ask Claude Code to update code references for new assets |
| "reach / match / likely" | College list categorization tiers (stretch / realistic / safety) |
