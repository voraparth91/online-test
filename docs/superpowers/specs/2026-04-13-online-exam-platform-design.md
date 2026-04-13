# Online Exam Platform — Design Spec

## Overview

A web application for administering multiple-choice exams. Two roles: **Admin** (manages candidates, exams, views results) and **Candidate** (takes live exams, views own results). First exam is seeded from insurance training PPT materials.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Single codebase, server components, server actions |
| UI | Tailwind CSS + shadcn/ui | Clean components, minimal effort |
| Database | Supabase (PostgreSQL) | Free tier: 500MB DB, 50k MAU |
| Auth | Supabase Auth | Email/password, JWT, built-in rate limiting |
| Hosting | Vercel | Free tier, native Next.js support |

## Architecture

```
Browser → Vercel (Next.js App Router)
              ├── /admin/*      (admin pages, protected)
              ├── /candidate/*  (candidate pages, protected)
              ├── /api/*        (server actions / route handlers)
              └── Supabase
                    ├── PostgreSQL (all data)
                    ├── Auth (email/password login)
                    └── Row Level Security (role-based access)
```

- Server Components + Server Actions for data mutations. No separate API layer.
- Supabase Admin API (server-side only, via `SUPABASE_SERVICE_ROLE_KEY`) for creating candidate auth accounts.

## Data Model

### profiles
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, FK → auth.users |
| email | text | |
| full_name | text | |
| role | text | 'admin' or 'candidate' |
| created_at | timestamptz | |

### exams
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| title | text | |
| description | text | |
| time_limit_minutes | integer | nullable — null means untimed |
| max_attempts | integer | nullable — null means unlimited |
| is_live | boolean | candidates only see live exams |
| created_by | UUID | FK → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### questions
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| exam_id | UUID | FK → exams |
| question_text | text | |
| options | JSONB | array of {label: "A", text: "..."} |
| correct_option | text | e.g., "A" |
| sort_order | integer | |

### exam_attempts
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| exam_id | UUID | FK → exams |
| candidate_id | UUID | FK → profiles |
| started_at | timestamptz | |
| submitted_at | timestamptz | nullable — null means in progress |
| score | integer | set on submission |
| total_questions | integer | |

### attempt_answers
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| attempt_id | UUID | FK → exam_attempts |
| question_id | UUID | FK → questions |
| selected_option | text | e.g., "B" |
| is_correct | boolean | set on submission |

## Authentication & Security

### Three-layer defense in depth

1. **Next.js Middleware (route level):** Runs before every request. Validates JWT from HTTP-only secure cookie. Redirects unauthenticated users to `/login`. Enforces role-based route access (`/admin/*` for admins, `/candidate/*` for candidates).

2. **Server Actions (application level):** Every server action re-validates the session server-side. Checks role before executing. Returns 403 if role doesn't match.

3. **Supabase RLS (database level):** Candidates can only read their own attempts/answers. Candidates can only read live exams. Only admins can insert/update exams and questions. Only admins can read all attempts.

### Additional measures

- **JWT storage:** HTTP-only, Secure, SameSite=Strict cookie (not localStorage).
- **CSRF protection:** Built into Next.js Server Actions (origin checking).
- **Password hashing:** Handled by Supabase Auth (bcrypt). Raw passwords never stored or visible.
- **Rate limiting:** Supabase Auth has built-in rate limiting on login attempts.
- **Input validation:** All inputs validated server-side with Zod schemas before database operations.
- **SQL injection prevention:** Supabase client uses parameterized queries exclusively.
- **No client-side answers:** Correct answers never sent to the browser during an exam. Scoring happens server-side on submission. Results fetched only after submission.

## Pages & Routes

### Auth
| Route | Purpose |
|---|---|
| `/login` | Single login page. After login, middleware redirects by role. |

### Admin
| Route | Purpose |
|---|---|
| `/admin/dashboard` | Overview — exam count, candidate count, recent activity |
| `/admin/candidates` | List candidates, create new candidate (email + name + password) |
| `/admin/exams` | List all exams, create new exam |
| `/admin/exams/[id]` | Edit exam — manage questions, set time limit, max attempts, toggle live |
| `/admin/exams/[id]/results` | All candidate attempts for this exam |
| `/admin/results/[attemptId]` | Specific candidate's answers vs. correct answers |

### Candidate
| Route | Purpose |
|---|---|
| `/candidate/dashboard` | Live exams available + past attempts with scores |
| `/candidate/exam/[id]` | Take exam — all questions on one scrollable page, timer if timed |
| `/candidate/exam/[id]/submit` | Confirmation before final submission |
| `/candidate/results/[attemptId]` | Detailed results — each question, selected vs. correct answer |

## UX Decisions

- **All questions on one page** (scrollable list, not one-at-a-time wizard). Candidates can review before submitting.
- **Timed exams:** Countdown timer pinned to the top. Auto-submits when time runs out. Remaining time is calculated from `started_at + time_limit_minutes` — no pause/resume. If the candidate navigates away, the clock keeps running.
- **No self-registration.** Admin creates candidates with a temporary password.
- **Results show full detail:** Each question with candidate's answer, correct answer, and right/wrong indicator.

## First Exam: Insurance Fundamentals

- **Title:** "Insurance Fundamentals — Comprehensive Assessment"
- **Source:** 8 PowerPoint chapters in `materials/` directory
- **20 questions** spread across all 8 chapters (~2-3 per chapter)
- **4 options each** (A–D), one correct answer
- Questions test understanding (scenario-based where possible), not just rote memorization
- **Defaults:** 30 minutes time limit, 2 max attempts, starts as draft

### Chapter coverage
| Chapter | Topic | Questions |
|---|---|---|
| 1 | Introduction to Insurance Concepts | 2-3 |
| 2 | Principles of Insurance | 2-3 |
| 4a | Underwriting Basics | 2-3 |
| 4b | Policy Lifecycle | 2-3 |
| 5 | Ratemaking & Premiums | 2-3 |
| 6 | Policy Limits & Deductibles | 2-3 |
| 7 | Commercial General Liability | 2-3 |
| 8 | Excess and Umbrella Insurance | 2-3 |

## Deployment

| Service | Purpose | Free Tier |
|---|---|---|
| Vercel | Host Next.js app | 100GB bandwidth/mo, serverless functions |
| Supabase | Postgres DB + Auth | 500MB DB, 50k MAU, unlimited API requests |

### Environment variables
| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public anon key (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin operations (creating users) |

### Deployment steps
1. Push code to GitHub
2. Connect repo to Vercel — auto-deploys on push
3. Set environment variables in Vercel
4. Run database migration (Supabase SQL editor or CLI)
5. Run seed script to create admin user and first exam

### Seed data
- 1 admin user
- 2 test candidates
- 20-question insurance fundamentals exam (draft — admin toggles live)

## Scale

Designed for ~10 concurrent users. Free tiers of Vercel and Supabase are well above this threshold.
