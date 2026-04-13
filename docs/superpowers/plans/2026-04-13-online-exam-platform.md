# Online Exam Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack online exam platform where admins manage candidates and multiple-choice exams, candidates take timed exams and view detailed results, all persisted in Supabase and hosted free on Vercel.

**Architecture:** Next.js 15 App Router with Server Components and Server Actions for all data mutations. Supabase provides PostgreSQL with Row Level Security, plus email/password authentication. Single deployment on Vercel.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth), Zod, Vercel

---

## File Structure

```
src/
  app/
    layout.tsx                          # Root layout (fonts, Tailwind globals)
    page.tsx                            # Redirect to /login
    login/
      page.tsx                          # Login form for both roles
    admin/
      layout.tsx                        # Admin shell with sidebar nav
      dashboard/page.tsx                # Stats overview
      candidates/page.tsx               # List + create candidates
      exams/page.tsx                    # List + create exams
      exams/[id]/page.tsx               # Edit exam: settings + manage questions
      exams/[id]/results/page.tsx       # All attempts for this exam
      results/[attemptId]/page.tsx      # Single attempt detail
    candidate/
      layout.tsx                        # Candidate shell with top nav
      dashboard/page.tsx                # Live exams + past attempts
      exam/[id]/page.tsx                # Take exam (questions + timer)
      results/[attemptId]/page.tsx      # Detailed result review
  lib/
    supabase/
      client.ts                         # Browser client (createBrowserClient)
      server.ts                         # Server client (createServerClient)
      admin.ts                          # Service role client (admin ops)
    types.ts                            # Database types
    validations.ts                      # Zod schemas
    scoring.ts                          # Pure scoring function
  actions/
    auth.ts                             # Login / logout server actions
    candidates.ts                       # Create candidate (admin)
    exams.ts                            # CRUD exams (admin)
    questions.ts                        # CRUD questions (admin)
    exam-taking.ts                      # Start attempt, save answers, submit
  components/
    ui/                                 # shadcn/ui components (auto-generated)
    admin-sidebar.tsx                   # Admin navigation sidebar
    candidate-nav.tsx                   # Candidate top navigation bar
    question-card.tsx                   # Single MCQ display (exam-taking)
    exam-timer.tsx                      # Countdown timer component
    result-question-card.tsx            # Question review with correct/wrong
  middleware.ts                         # Route protection + role redirect
supabase/
  migrations/
    001_initial_schema.sql              # Tables + RLS policies
  seed.sql                              # Admin user, test candidates, 20-question exam
.env.local.example                      # Template for environment variables
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local.example`
- Create: shadcn/ui components (button, input, label, card, badge, table, dialog, select, radio-group, toast, separator, dropdown-menu, alert)

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/parth.vora/code/online-test
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

When prompted, accept defaults. This creates the full Next.js 15 project with Tailwind CSS and TypeScript.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod lucide-react
```

- [ ] **Step 3: Initialize shadcn/ui and add components**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card badge table dialog select radio-group toast separator dropdown-menu alert textarea
```

- [ ] **Step 4: Create environment variable template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

- [ ] **Step 5: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Online Exam Platform",
  description: "Take and manage online examinations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create root page redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` — should redirect to `/login` (404 is fine, the page doesn't exist yet).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Tailwind, shadcn/ui, and Supabase deps"
```

---

### Task 2: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/types.ts`

- [ ] **Step 1: Create browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create admin (service role) client**

Create `src/lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

- [ ] **Step 4: Create database types**

Create `src/lib/types.ts`:

```ts
export type UserRole = "admin" | "candidate";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_live: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  sort_order: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  candidate_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

// Joined types for display
export interface ExamAttemptWithExam extends ExamAttempt {
  exams: Pick<Exam, "title">;
}

export interface ExamAttemptWithCandidate extends ExamAttempt {
  profiles: Pick<Profile, "full_name" | "email">;
}

export interface AttemptAnswerWithQuestion extends AttemptAnswer {
  questions: Pick<Question, "question_text" | "options" | "correct_option" | "sort_order">;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add Supabase client utilities and database types"
```

---

### Task 3: Database Schema and RLS Policies

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'candidate')),
  created_at timestamptz default now() not null
);

-- Exams table
create table public.exams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null default '',
  time_limit_minutes integer,
  max_attempts integer,
  is_live boolean default false not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Questions table
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references public.exams(id) on delete cascade not null,
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  sort_order integer not null default 0
);

-- Exam attempts table
create table public.exam_attempts (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references public.exams(id) on delete cascade not null,
  candidate_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  submitted_at timestamptz,
  score integer,
  total_questions integer not null
);

-- Attempt answers table
create table public.attempt_answers (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.exam_attempts(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  selected_option text,
  is_correct boolean
);

-- Indexes
create index idx_questions_exam_id on public.questions(exam_id);
create index idx_exam_attempts_exam_id on public.exam_attempts(exam_id);
create index idx_exam_attempts_candidate_id on public.exam_attempts(candidate_id);
create index idx_attempt_answers_attempt_id on public.attempt_answers(attempt_id);

-- Updated_at trigger for exams
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_exams_updated
  before update on public.exams
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'candidate')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security Policies
-- ============================================================

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.attempt_answers enable row level security;

-- Helper function: get current user's role
create or replace function public.get_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.get_user_role() = 'admin');

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.get_user_role() = 'admin');

-- EXAMS policies
create policy "Admins can do everything with exams"
  on public.exams for all
  using (public.get_user_role() = 'admin');

create policy "Candidates can read live exams"
  on public.exams for select
  using (is_live = true and public.get_user_role() = 'candidate');

-- QUESTIONS policies
create policy "Admins can do everything with questions"
  on public.questions for all
  using (public.get_user_role() = 'admin');

create policy "Candidates can read questions of live exams"
  on public.questions for select
  using (
    public.get_user_role() = 'candidate'
    and exam_id in (select id from public.exams where is_live = true)
  );

-- EXAM_ATTEMPTS policies
create policy "Admins can read all attempts"
  on public.exam_attempts for select
  using (public.get_user_role() = 'admin');

create policy "Candidates can read own attempts"
  on public.exam_attempts for select
  using (candidate_id = auth.uid());

create policy "Candidates can insert own attempts"
  on public.exam_attempts for insert
  with check (candidate_id = auth.uid());

create policy "Candidates can update own unsubmitted attempts"
  on public.exam_attempts for update
  using (candidate_id = auth.uid() and submitted_at is null);

-- ATTEMPT_ANSWERS policies
create policy "Admins can read all answers"
  on public.attempt_answers for select
  using (public.get_user_role() = 'admin');

create policy "Candidates can read own answers"
  on public.attempt_answers for select
  using (
    attempt_id in (
      select id from public.exam_attempts where candidate_id = auth.uid()
    )
  );

create policy "Candidates can insert own answers"
  on public.attempt_answers for insert
  with check (
    attempt_id in (
      select id from public.exam_attempts
      where candidate_id = auth.uid() and submitted_at is null
    )
  );

create policy "Candidates can update own unsubmitted answers"
  on public.attempt_answers for update
  using (
    attempt_id in (
      select id from public.exam_attempts
      where candidate_id = auth.uid() and submitted_at is null
    )
  );
```

- [ ] **Step 2: Run migration in Supabase**

Go to your Supabase project dashboard > SQL Editor. Paste the entire contents of `001_initial_schema.sql` and execute it.

Alternatively, if using Supabase CLI:

```bash
npx supabase db push
```

Expected: All tables created, RLS enabled, triggers active.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with tables, indexes, triggers, and RLS policies"
```

---

### Task 4: Zod Validation Schemas and Scoring Logic

**Files:**
- Create: `src/lib/validations.ts`, `src/lib/scoring.ts`
- Create: `src/lib/__tests__/scoring.test.ts`, `src/lib/__tests__/validations.test.ts`

- [ ] **Step 1: Write failing tests for scoring logic**

Create `src/lib/__tests__/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scoreExam } from "../scoring";

describe("scoreExam", () => {
  it("scores all correct answers", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
      { id: "q3", correct_option: "C" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: "B" },
      { question_id: "q3", selected_option: "C" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(3);
    expect(result.details.every((d) => d.is_correct)).toBe(true);
  });

  it("scores all wrong answers", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "C" },
      { question_id: "q2", selected_option: "D" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(0);
    expect(result.details.every((d) => !d.is_correct)).toBe(true);
  });

  it("scores unanswered questions as wrong", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: null },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(1);
    expect(result.details[0].is_correct).toBe(true);
    expect(result.details[1].is_correct).toBe(false);
  });

  it("handles mixed correct and wrong", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
      { id: "q3", correct_option: "C" },
      { id: "q4", correct_option: "D" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: "A" },
      { question_id: "q3", selected_option: "C" },
      { question_id: "q4", selected_option: "A" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(2);
  });
});
```

- [ ] **Step 2: Install vitest and run tests to verify they fail**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

```bash
npm test
```

Expected: FAIL — `Cannot find module '../scoring'`

- [ ] **Step 3: Write scoring logic**

Create `src/lib/scoring.ts`:

```ts
interface QuestionKey {
  id: string;
  correct_option: string;
}

interface AnswerInput {
  question_id: string;
  selected_option: string | null;
}

interface ScoredAnswer {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean;
}

export function scoreExam(
  questions: QuestionKey[],
  answers: AnswerInput[]
): { score: number; details: ScoredAnswer[] } {
  const answerMap = new Map(
    answers.map((a) => [a.question_id, a.selected_option])
  );

  const details: ScoredAnswer[] = questions.map((q) => {
    const selected = answerMap.get(q.id) ?? null;
    return {
      question_id: q.id,
      selected_option: selected,
      is_correct: selected !== null && selected === q.correct_option,
    };
  });

  const score = details.filter((d) => d.is_correct).length;
  return { score, details };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Write Zod validation schemas**

Create `src/lib/validations.ts`:

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createCandidateSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Name is required").max(200),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createExamSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).default(""),
  time_limit_minutes: z.coerce.number().int().positive().nullable(),
  max_attempts: z.coerce.number().int().positive().nullable(),
});

export const updateExamSchema = createExamSchema.extend({
  is_live: z.boolean(),
});

export const questionOptionSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1, "Option text is required"),
});

export const createQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required").max(2000),
  options: z
    .array(questionOptionSchema)
    .length(4, "Exactly 4 options required"),
  correct_option: z.enum(["A", "B", "C", "D"]),
});

export const submitAnswerSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.enum(["A", "B", "C", "D"]).nullable(),
});

export const submitExamSchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.array(submitAnswerSchema),
});
```

- [ ] **Step 6: Write validation tests**

Create `src/lib/__tests__/validations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  loginSchema,
  createCandidateSchema,
  createExamSchema,
  createQuestionSchema,
  submitExamSchema,
} from "../validations";

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCandidateSchema", () => {
  it("accepts valid candidate", () => {
    const result = createCandidateSchema.safeParse({
      email: "candidate@example.com",
      full_name: "John Doe",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCandidateSchema.safeParse({
      email: "candidate@example.com",
      full_name: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("createExamSchema", () => {
  it("accepts exam with nullable time limit", () => {
    const result = createExamSchema.safeParse({
      title: "Test Exam",
      description: "A test",
      time_limit_minutes: null,
      max_attempts: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts exam with time limit", () => {
    const result = createExamSchema.safeParse({
      title: "Test Exam",
      description: "",
      time_limit_minutes: 30,
      max_attempts: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("createQuestionSchema", () => {
  it("accepts valid question", () => {
    const result = createQuestionSchema.safeParse({
      question_text: "What is insurance?",
      options: [
        { label: "A", text: "Risk transfer" },
        { label: "B", text: "Gambling" },
        { label: "C", text: "Banking" },
        { label: "D", text: "Trading" },
      ],
      correct_option: "A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 4 options", () => {
    const result = createQuestionSchema.safeParse({
      question_text: "What is insurance?",
      options: [
        { label: "A", text: "Risk transfer" },
        { label: "B", text: "Gambling" },
      ],
      correct_option: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitExamSchema", () => {
  it("accepts valid submission", () => {
    const result = submitExamSchema.safeParse({
      attempt_id: "550e8400-e29b-41d4-a716-446655440000",
      answers: [
        {
          question_id: "550e8400-e29b-41d4-a716-446655440001",
          selected_option: "A",
        },
        {
          question_id: "550e8400-e29b-41d4-a716-446655440002",
          selected_option: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: All tests PASS (scoring + validation).

- [ ] **Step 8: Commit**

```bash
git add src/lib/ package.json
git commit -m "feat: add Zod validation schemas and scoring logic with tests"
```

---

### Task 5: Authentication — Login Page and Server Actions

**Files:**
- Create: `src/app/login/page.tsx`, `src/actions/auth.ts`

- [ ] **Step 1: Create auth server actions**

Create `src/actions/auth.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password" };
  }

  // Get user role for redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication failed" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/candidate/dashboard");
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Online Exam Platform</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify login page renders**

```bash
npm run dev
```

Open `http://localhost:3000/login` — should see centered login card with email/password fields.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/ src/actions/auth.ts
git commit -m "feat: add login page and auth server actions"
```

---

### Task 6: Middleware — Route Protection and Role Redirect

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/login") {
    if (user) {
      // Already logged in — redirect to appropriate dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const url = request.nextUrl.clone();
      url.pathname =
        profile?.role === "admin" ? "/admin/dashboard" : "/candidate/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Protected routes — require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pathname.startsWith("/admin") && profile?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/candidate/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/candidate") && profile?.role !== "candidate") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verify middleware redirects unauthenticated users**

```bash
npm run dev
```

Open `http://localhost:3000/admin/dashboard` — should redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware for route protection and role-based access"
```

---

### Task 7: Admin Layout, Sidebar, and Dashboard

**Files:**
- Create: `src/components/admin-sidebar.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create admin sidebar**

Create `src/components/admin-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/exams", label: "Exams", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Exam Platform</h1>
        <p className="text-sm text-gray-500">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout}>
        <Button variant="ghost" className="w-full justify-start gap-3" type="submit">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 2: Create admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard page**

Create `src/app/admin/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, ClipboardCheck } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: candidateCount },
    { count: examCount },
    { count: attemptCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "candidate"),
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .not("submitted_at", "is", null),
  ]);

  const stats = [
    {
      label: "Total Candidates",
      value: candidateCount ?? 0,
      icon: Users,
    },
    {
      label: "Total Exams",
      value: examCount ?? 0,
      icon: FileText,
    },
    {
      label: "Completed Attempts",
      value: attemptCount ?? 0,
      icon: ClipboardCheck,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin-sidebar.tsx src/app/admin/
git commit -m "feat: add admin layout, sidebar navigation, and dashboard"
```

---

### Task 8: Admin — Candidate Management

**Files:**
- Create: `src/actions/candidates.ts`, `src/app/admin/candidates/page.tsx`

- [ ] **Step 1: Create candidate server actions**

Create `src/actions/candidates.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCandidateSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createCandidate(formData: FormData) {
  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  const parsed = createCandidateSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Use admin client to create auth user
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: "candidate",
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function deleteCandidate(candidateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(candidateId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}
```

- [ ] **Step 2: Create candidates page**

Create `src/app/admin/candidates/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCandidate, deleteCandidate } from "@/actions/candidates";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function fetchCandidates() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "candidate")
      .order("created_at", { ascending: false });
    setCandidates(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    const result = await createCandidate(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setDialogOpen(false);
    setSubmitting(false);
    toast({ title: "Candidate created successfully" });
    fetchCandidates();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    const result = await deleteCandidate(id);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Candidate deleted" });
    fetchCandidates();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Candidate</DialogTitle>
              <DialogDescription>
                Create a candidate account with email and password.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Candidate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
          <CardDescription>
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : candidates.length === 0 ? (
            <p className="text-gray-500">No candidates yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/candidates.ts src/app/admin/candidates/
git commit -m "feat: add admin candidate management with create and delete"
```

---

### Task 9: Admin — Exam Management (List + Create)

**Files:**
- Create: `src/actions/exams.ts`, `src/app/admin/exams/page.tsx`

- [ ] **Step 1: Create exam server actions**

Create `src/actions/exams.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createExamSchema, updateExamSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return { supabase, user };
}

export async function createExam(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const parsed = createExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    time_limit_minutes: formData.get("time_limit_minutes") || null,
    max_attempts: formData.get("max_attempts") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/admin/exams/${data.id}`);
}

export async function updateExam(examId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = updateExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    time_limit_minutes: formData.get("time_limit_minutes") || null,
    max_attempts: formData.get("max_attempts") || null,
    is_live: formData.get("is_live") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from("exams")
    .update(parsed.data)
    .eq("id", examId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { success: true };
}

export async function deleteExam(examId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("exams").delete().eq("id", examId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/exams");
  return { success: true };
}
```

- [ ] **Step 2: Create exams list page**

Create `src/app/admin/exams/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createExam, deleteExam } from "@/actions/exams";
import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function fetchExams() {
    const supabase = createClient();
    const { data } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });
    setExams(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchExams();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this exam and all its questions?")) return;
    const result = await deleteExam(id);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Exam deleted" });
    fetchExams();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exams</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
              <DialogDescription>
                Set up an exam. You can add questions after creating it.
              </DialogDescription>
            </DialogHeader>
            <form action={createExam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time_limit_minutes">
                    Time Limit (minutes)
                  </Label>
                  <Input
                    id="time_limit_minutes"
                    name="time_limit_minutes"
                    type="number"
                    min="1"
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Max Attempts</Label>
                  <Input
                    id="max_attempts"
                    name="max_attempts"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Exam
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>{exams.length} exam{exams.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : exams.length === 0 ? (
            <p className="text-gray-500">No exams yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Max Attempts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>
                      {exam.time_limit_minutes
                        ? `${exam.time_limit_minutes} min`
                        : "No limit"}
                    </TableCell>
                    <TableCell>
                      {exam.max_attempts ?? "Unlimited"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exam.is_live ? "default" : "secondary"}>
                        {exam.is_live ? "Live" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/exams/${exam.id}/results`}>
                          <Button variant="ghost" size="sm">
                            Results
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(exam.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/exams.ts src/app/admin/exams/page.tsx
git commit -m "feat: add admin exam list and create pages"
```

---

### Task 10: Admin — Exam Detail with Question Management

**Files:**
- Create: `src/actions/questions.ts`, `src/app/admin/exams/[id]/page.tsx`

- [ ] **Step 1: Create question server actions**

Create `src/actions/questions.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createQuestionSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return { supabase };
}

export async function createQuestion(examId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = createQuestionSchema.safeParse({
    question_text: formData.get("question_text"),
    options: [
      { label: "A", text: formData.get("option_a") },
      { label: "B", text: formData.get("option_b") },
      { label: "C", text: formData.get("option_c") },
      { label: "D", text: formData.get("option_d") },
    ],
    correct_option: formData.get("correct_option"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Get current max sort_order
  const { data: existing } = await supabase
    .from("questions")
    .select("sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { error } = await supabase.from("questions").insert({
    exam_id: examId,
    question_text: parsed.data.question_text,
    options: parsed.data.options,
    correct_option: parsed.data.correct_option,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  return { success: true };
}

export async function deleteQuestion(examId: string, questionId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  return { success: true };
}
```

- [ ] **Step 2: Create exam detail page**

Create `src/app/admin/exams/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateExam } from "@/actions/exams";
import { createQuestion, deleteQuestion } from "@/actions/questions";
import type { Exam, Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function fetchData() {
    const supabase = createClient();
    const [{ data: examData }, { data: questionsData }] = await Promise.all([
      supabase.from("exams").select("*").eq("id", examId).single(),
      supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId)
        .order("sort_order"),
    ]);
    setExam(examData);
    setQuestions(questionsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [examId]);

  async function handleUpdateExam(formData: FormData) {
    setSaving(true);
    const result = await updateExam(examId, formData);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Exam updated" });
    }
    setSaving(false);
    fetchData();
  }

  async function handleCreateQuestion(formData: FormData) {
    const result = await createQuestion(examId, formData);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    setDialogOpen(false);
    toast({ title: "Question added" });
    fetchData();
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    const result = await deleteQuestion(examId, questionId);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Question deleted" });
    fetchData();
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!exam) return <p className="text-red-500">Exam not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Exam</h1>

      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdateExam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={exam.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={exam.description}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                <Input
                  id="time_limit_minutes"
                  name="time_limit_minutes"
                  type="number"
                  min="1"
                  defaultValue={exam.time_limit_minutes ?? ""}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_attempts">Max Attempts</Label>
                <Input
                  id="max_attempts"
                  name="max_attempts"
                  type="number"
                  min="1"
                  defaultValue={exam.max_attempts ?? ""}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <input
                  type="hidden"
                  name="is_live"
                  value={exam.is_live ? "true" : "false"}
                />
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={exam.is_live ? "default" : "secondary"}>
                    {exam.is_live ? "Live" : "Draft"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.set("title", exam.title);
                      fd.set("description", exam.description);
                      if (exam.time_limit_minutes)
                        fd.set("time_limit_minutes", String(exam.time_limit_minutes));
                      if (exam.max_attempts)
                        fd.set("max_attempts", String(exam.max_attempts));
                      fd.set("is_live", exam.is_live ? "false" : "true");
                      await updateExam(examId, fd);
                      toast({
                        title: exam.is_live
                          ? "Exam set to draft"
                          : "Exam is now live",
                      });
                      fetchData();
                    }}
                  >
                    {exam.is_live ? "Set to Draft" : "Make Live"}
                  </Button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Questions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Questions ({questions.length})
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
            </DialogHeader>
            <form action={handleCreateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_text">Question</Label>
                <Textarea id="question_text" name="question_text" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_a">Option A</Label>
                <Input id="option_a" name="option_a" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_b">Option B</Label>
                <Input id="option_b" name="option_b" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_c">Option C</Label>
                <Input id="option_c" name="option_c" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_d">Option D</Label>
                <Input id="option_d" name="option_d" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct_option">Correct Answer</Label>
                <Select name="correct_option" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Add Question
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">
                  Q{i + 1}. {q.question_text}
                </CardTitle>
                <CardDescription>
                  Correct answer: {q.correct_option}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteQuestion(q.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <div
                    key={opt.label}
                    className={`p-2 rounded text-sm ${
                      opt.label === q.correct_option
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className="font-medium">{opt.label}.</span> {opt.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/questions.ts src/app/admin/exams/\[id\]/page.tsx
git commit -m "feat: add exam detail page with question management"
```

---

### Task 11: Candidate Layout, Nav, and Dashboard

**Files:**
- Create: `src/components/candidate-nav.tsx`, `src/app/candidate/layout.tsx`, `src/app/candidate/dashboard/page.tsx`

- [ ] **Step 1: Create candidate navigation**

Create `src/components/candidate-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { LogOut } from "lucide-react";

export function CandidateNav() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/candidate/dashboard" className="font-bold text-lg">
          Exam Platform
        </Link>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create candidate layout**

Create `src/app/candidate/layout.tsx`:

```tsx
import { CandidateNav } from "@/components/candidate-nav";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CandidateNav />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create candidate dashboard**

Create `src/app/candidate/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, CheckCircle2 } from "lucide-react";
import type { Exam, ExamAttemptWithExam } from "@/lib/types";

export default async function CandidateDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch live exams
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false });

  // Fetch this candidate's attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, exams(title)")
    .eq("candidate_id", user!.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  // Count attempts per exam for this candidate
  const attemptCounts: Record<string, number> = {};
  if (attempts) {
    for (const a of attempts) {
      attemptCounts[a.exam_id] = (attemptCounts[a.exam_id] || 0) + 1;
    }
  }

  // Check for in-progress attempts
  const { data: inProgressAttempts } = await supabase
    .from("exam_attempts")
    .select("*, exams(title)")
    .eq("candidate_id", user!.id)
    .is("submitted_at", null);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {/* In-progress exams */}
      {inProgressAttempts && inProgressAttempts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inProgressAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span>{(a as ExamAttemptWithExam).exams?.title ?? "Exam"}</span>
                <Link href={`/candidate/exam/${a.exam_id}`}>
                  <Button size="sm">Continue</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available exams */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Available Exams</h2>
        {!exams || exams.length === 0 ? (
          <p className="text-gray-500">No exams available right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(exams as Exam[]).map((exam) => {
              const usedAttempts = attemptCounts[exam.id] || 0;
              const canTake =
                !exam.max_attempts || usedAttempts < exam.max_attempts;

              return (
                <Card key={exam.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    {exam.description && (
                      <CardDescription>{exam.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      {exam.time_limit_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {exam.time_limit_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {usedAttempts}
                        {exam.max_attempts ? `/${exam.max_attempts}` : ""}{" "}
                        attempts
                      </span>
                    </div>
                    {canTake ? (
                      <Link href={`/candidate/exam/${exam.id}`}>
                        <Button className="w-full">
                          {usedAttempts > 0 ? "Retake Exam" : "Start Exam"}
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        Max attempts reached
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Past attempts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">My Results</h2>
        {!attempts || attempts.length === 0 ? (
          <p className="text-gray-500">No completed exams yet.</p>
        ) : (
          <div className="space-y-3">
            {(attempts as ExamAttemptWithExam[]).map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{a.exams?.title ?? "Exam"}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(a.submitted_at!).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {a.score}/{a.total_questions}
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round(((a.score ?? 0) / a.total_questions) * 100)}%
                      </p>
                    </div>
                    <Link href={`/candidate/results/${a.id}`}>
                      <Button variant="outline" size="sm">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/candidate-nav.tsx src/app/candidate/
git commit -m "feat: add candidate layout, nav, and dashboard"
```

---

### Task 12: Candidate — Take Exam Page with Timer

**Files:**
- Create: `src/actions/exam-taking.ts`, `src/components/exam-timer.tsx`, `src/components/question-card.tsx`, `src/app/candidate/exam/[id]/page.tsx`

- [ ] **Step 1: Create exam-taking server actions**

Create `src/actions/exam-taking.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { submitExamSchema } from "@/lib/validations";
import { scoreExam } from "@/lib/scoring";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function startExamAttempt(examId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check if exam is live
  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("is_live", true)
    .single();

  if (!exam) return { error: "Exam not found or not live" };

  // Check for in-progress attempt
  const { data: existing } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  if (existing) {
    return { attemptId: existing.id };
  }

  // Check max attempts
  if (exam.max_attempts) {
    const { count } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", examId)
      .eq("candidate_id", user.id)
      .not("submitted_at", "is", null);

    if (count !== null && count >= exam.max_attempts) {
      return { error: "Maximum attempts reached" };
    }
  }

  // Get question count
  const { count: questionCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", examId);

  // Create new attempt
  const { data: attempt, error } = await supabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      candidate_id: user.id,
      total_questions: questionCount ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  return { attemptId: attempt.id };
}

export async function getExamForTaking(examId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("is_live", true)
    .single();

  if (!exam) return { error: "Exam not found or not live" };

  // Fetch questions WITHOUT correct_option — server strips it
  const { data: questions } = await supabase
    .from("questions")
    .select("id, exam_id, question_text, options, sort_order")
    .eq("exam_id", examId)
    .order("sort_order");

  // Fetch in-progress attempt if any
  const { data: existingAttempt } = await supabase
    .from("exam_attempts")
    .select("id, started_at")
    .eq("exam_id", examId)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  return {
    exam,
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      exam_id: q.exam_id,
      question_text: q.question_text,
      options: q.options,
      sort_order: q.sort_order,
    })),
    existingAttempt,
  };
}

export async function submitExam(formData: {
  attempt_id: string;
  answers: { question_id: string; selected_option: string | null }[];
}) {
  const parsed = submitExamSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify attempt belongs to user and is not submitted
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", parsed.data.attempt_id)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  if (!attempt) return { error: "Attempt not found or already submitted" };

  // Fetch correct answers (server-side only)
  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_option")
    .eq("exam_id", attempt.exam_id);

  if (!questions) return { error: "Failed to fetch questions" };

  // Score the exam
  const { score, details } = scoreExam(questions, parsed.data.answers);

  // Insert answers
  const answerRows = details.map((d) => ({
    attempt_id: attempt.id,
    question_id: d.question_id,
    selected_option: d.selected_option,
    is_correct: d.is_correct,
  }));

  const { error: answerError } = await supabase
    .from("attempt_answers")
    .insert(answerRows);

  if (answerError) return { error: answerError.message };

  // Update attempt with score and submission time
  const { error: updateError } = await supabase
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score,
    })
    .eq("id", attempt.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/candidate/dashboard");
  redirect(`/candidate/results/${attempt.id}`);
}
```

- [ ] **Step 2: Create exam timer component**

Create `src/components/exam-timer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  startedAt: string;
  timeLimitMinutes: number;
  onTimeUp: () => void;
}

export function ExamTimer({
  startedAt,
  timeLimitMinutes,
  onTimeUp,
}: ExamTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );
    return Math.max(0, timeLimitMinutes * 60 - elapsed);
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft < 300; // under 5 minutes

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-mono text-lg ${
        isLow
          ? "bg-red-100 text-red-700 border border-red-200"
          : "bg-blue-50 text-blue-700 border border-blue-200"
      }`}
    >
      <Clock className="h-5 w-5" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
```

- [ ] **Step 3: Create question card component**

Create `src/components/question-card.tsx`:

```tsx
"use client";

import type { QuestionOption } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionCardProps {
  index: number;
  questionId: string;
  questionText: string;
  options: QuestionOption[];
  selectedOption: string | null;
  onSelect: (questionId: string, option: string) => void;
}

export function QuestionCard({
  index,
  questionId,
  questionText,
  options,
  selectedOption,
  onSelect,
}: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          <span className="text-gray-400 mr-2">Q{index}.</span>
          {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedOption ?? ""}
          onValueChange={(val) => onSelect(questionId, val)}
        >
          {options.map((opt) => (
            <div key={opt.label} className="flex items-center space-x-3 py-2">
              <RadioGroupItem
                value={opt.label}
                id={`${questionId}-${opt.label}`}
              />
              <Label
                htmlFor={`${questionId}-${opt.label}`}
                className="text-sm font-normal cursor-pointer"
              >
                <span className="font-medium mr-1">{opt.label}.</span>
                {opt.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create exam-taking page**

Create `src/app/candidate/exam/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { startExamAttempt, submitExam, getExamForTaking } from "@/actions/exam-taking";
import type { Exam, Question } from "@/lib/types";
import { QuestionCard } from "@/components/question-card";
import { ExamTimer } from "@/components/exam-timer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TakeExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Fetch exam + questions via server action (correct_option never sent)
      const examResult = await getExamForTaking(examId);
      if (examResult.error || !examResult.exam) {
        setError(examResult.error ?? "Exam not found");
        setLoading(false);
        return;
      }

      setExam(examResult.exam);
      setQuestions(
        examResult.questions.map((q: any) => ({
          ...q,
          correct_option: "", // Never sent from server
        }))
      );

      // Start or resume attempt
      const result = await startExamAttempt(examId);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setAttemptId(result.attemptId!);

      // Use existing attempt's started_at if resuming
      if (examResult.existingAttempt) {
        setStartedAt(examResult.existingAttempt.started_at);
      } else {
        setStartedAt(new Date().toISOString());
      }

      setLoading(false);
    }
    init();
  }, [examId]);

  function handleSelect(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    const answerList = questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id] ?? null,
    }));

    await submitExam({ attempt_id: attemptId, answers: answerList });
    // redirect happens in server action
  }, [attemptId, answers, questions, submitting]);

  if (loading) return <p className="text-gray-500 p-8">Loading exam...</p>;
  if (error)
    return (
      <Alert variant="destructive" className="m-8">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!exam) return null;

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;

  return (
    <div className="space-y-6">
      {/* Sticky header with timer */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {exam.time_limit_minutes && startedAt && (
              <ExamTimer
                startedAt={startedAt}
                timeLimitMinutes={exam.time_limit_minutes}
                onTimeUp={handleSubmit}
              />
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            questionId={q.id}
            questionText={q.question_text}
            options={q.options}
            selectedOption={answers[q.id] ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Bottom submit */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm text-gray-500">
            {answeredCount} of {questions.length} questions answered
          </p>
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/actions/exam-taking.ts src/components/exam-timer.tsx src/components/question-card.tsx src/app/candidate/exam/
git commit -m "feat: add exam-taking page with timer, questions, and submission"
```

---

### Task 13: Results Pages — Candidate and Admin

**Files:**
- Create: `src/components/result-question-card.tsx`, `src/app/candidate/results/[attemptId]/page.tsx`, `src/app/admin/exams/[id]/results/page.tsx`, `src/app/admin/results/[attemptId]/page.tsx`

- [ ] **Step 1: Create result question card component**

Create `src/components/result-question-card.tsx`:

```tsx
import type { QuestionOption } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface ResultQuestionCardProps {
  index: number;
  questionText: string;
  options: QuestionOption[];
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
}

export function ResultQuestionCard({
  index,
  questionText,
  options,
  selectedOption,
  correctOption,
  isCorrect,
}: ResultQuestionCardProps) {
  return (
    <Card className={isCorrect ? "border-green-200" : "border-red-200"}>
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        {isCorrect ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <CardTitle className="text-base font-medium">
          <span className="text-gray-400 mr-2">Q{index}.</span>
          {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-11">
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = opt.label === selectedOption;
            const isCorrectOpt = opt.label === correctOption;

            let className = "p-2 rounded text-sm border ";
            if (isCorrectOpt) {
              className += "bg-green-50 border-green-200 text-green-800";
            } else if (isSelected && !isCorrectOpt) {
              className += "bg-red-50 border-red-200 text-red-800";
            } else {
              className += "bg-gray-50 border-gray-200 text-gray-600";
            }

            return (
              <div key={opt.label} className={className}>
                <span className="font-medium">{opt.label}.</span> {opt.text}
                {isCorrectOpt && (
                  <span className="ml-2 text-xs font-medium">(Correct)</span>
                )}
                {isSelected && !isCorrectOpt && (
                  <span className="ml-2 text-xs font-medium">(Your answer)</span>
                )}
              </div>
            );
          })}
        </div>
        {!selectedOption && (
          <p className="text-sm text-gray-400 mt-2">Not answered</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create candidate results page**

Create `src/app/candidate/results/[attemptId]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResultQuestionCard } from "@/components/result-question-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { AttemptAnswerWithQuestion } from "@/lib/types";

export default async function CandidateResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch attempt
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*, exams(title)")
    .eq("id", attemptId)
    .eq("candidate_id", user.id)
    .not("submitted_at", "is", null)
    .single();

  if (!attempt) redirect("/candidate/dashboard");

  // Fetch answers with questions
  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("*, questions(question_text, options, correct_option, sort_order)")
    .eq("attempt_id", attemptId)
    .order("questions(sort_order)");

  const percentage = Math.round(
    ((attempt.score ?? 0) / attempt.total_questions) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam Results</h1>
        <Link href="/candidate/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Score summary */}
      <Card>
        <CardHeader>
          <CardTitle>{(attempt as any).exams?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold">
                {attempt.score}/{attempt.total_questions}
              </p>
              <p className="text-sm text-gray-500">Score</p>
            </div>
            <div className="text-center">
              <p
                className={`text-4xl font-bold ${
                  percentage >= 70 ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentage}%
              </p>
              <p className="text-sm text-gray-500">Percentage</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Submitted{" "}
                {new Date(attempt.submitted_at!).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question-by-question review */}
      <div className="space-y-4">
        {(answers as AttemptAnswerWithQuestion[])?.map((a, i) => (
          <ResultQuestionCard
            key={a.id}
            index={i + 1}
            questionText={a.questions.question_text}
            options={a.questions.options}
            selectedOption={a.selected_option}
            correctOption={a.questions.correct_option}
            isCorrect={a.is_correct ?? false}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin exam results overview page**

Create `src/app/admin/exams/[id]/results/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExamAttemptWithCandidate } from "@/lib/types";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("title")
    .eq("id", examId)
    .single();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, profiles(full_name, email)")
    .eq("exam_id", examId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results: {exam?.title}</h1>
          <p className="text-gray-500">
            {attempts?.length ?? 0} completed attempt
            {(attempts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href={`/admin/exams/${examId}`}>
          <Button variant="outline">Back to Exam</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!attempts || attempts.length === 0 ? (
            <p className="text-gray-500">No completed attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attempts as ExamAttemptWithCandidate[]).map((a) => {
                  const pct = Math.round(
                    ((a.score ?? 0) / a.total_questions) * 100
                  );
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.profiles?.full_name}
                      </TableCell>
                      <TableCell>{a.profiles?.email}</TableCell>
                      <TableCell>
                        {a.score}/{a.total_questions}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={pct >= 70 ? "default" : "destructive"}
                        >
                          {pct}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(a.submitted_at!).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/results/${a.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create admin individual attempt detail page**

Create `src/app/admin/results/[attemptId]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResultQuestionCard } from "@/components/result-question-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { AttemptAnswerWithQuestion } from "@/lib/types";

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*, exams(title), profiles(full_name, email)")
    .eq("id", attemptId)
    .not("submitted_at", "is", null)
    .single();

  if (!attempt) redirect("/admin/dashboard");

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("*, questions(question_text, options, correct_option, sort_order)")
    .eq("attempt_id", attemptId)
    .order("questions(sort_order)");

  const percentage = Math.round(
    ((attempt.score ?? 0) / attempt.total_questions) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attempt Detail</h1>
        <Link href={`/admin/exams/${attempt.exam_id}/results`}>
          <Button variant="outline">Back to Results</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{(attempt as any).exams?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-gray-500">Candidate</p>
              <p className="font-medium">
                {(attempt as any).profiles?.full_name} (
                {(attempt as any).profiles?.email})
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                {attempt.score}/{attempt.total_questions}
              </p>
              <p className="text-sm text-gray-500">Score</p>
            </div>
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${
                  percentage >= 70 ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentage}%
              </p>
              <p className="text-sm text-gray-500">Percentage</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {new Date(attempt.submitted_at!).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(answers as AttemptAnswerWithQuestion[])?.map((a, i) => (
          <ResultQuestionCard
            key={a.id}
            index={i + 1}
            questionText={a.questions.question_text}
            options={a.questions.options}
            selectedOption={a.selected_option}
            correctOption={a.questions.correct_option}
            isCorrect={a.is_correct ?? false}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/result-question-card.tsx src/app/candidate/results/ src/app/admin/exams/\[id\]/results/ src/app/admin/results/
git commit -m "feat: add results pages for candidate review and admin oversight"
```

---

### Task 14: Seed Data — Admin, Candidates, and 20-Question Insurance Exam

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write the seed SQL**

Create `supabase/seed.sql`:

```sql
-- ===========================================
-- SEED DATA: Insurance Fundamentals Exam
-- ===========================================
-- NOTE: This seed creates the exam, questions, and profiles.
-- Auth users must be created via the Supabase dashboard or Admin API.
-- Run the seed script from the app (see step 2) to create users + seed data.
--
-- This file is for reference. The actual seeding is done via the
-- /api/seed route in the Next.js app (Task 14, Step 2).

-- Exam will be inserted with questions via the API route.
```

- [ ] **Step 2: Create seed API route**

Create `src/app/api/seed/route.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SEED_SECRET = process.env.SEED_SECRET || "seed-dev-only";

const QUESTIONS = [
  {
    question_text:
      "Insurance acts as a risk transfer mechanism. Which type of risk does insurance primarily cover?",
    options: [
      { label: "A", text: "Speculative risk — where there is a chance of profit or loss" },
      { label: "B", text: "Pure risk — where there is only a chance of loss or no loss" },
      { label: "C", text: "Fundamental risk — affecting the entire economy" },
      { label: "D", text: "Financial risk — related to stock market investments" },
    ],
    correct_option: "B",
    sort_order: 1,
  },
  {
    question_text:
      "The Law of Large Numbers allows insurers to:",
    options: [
      { label: "A", text: "Eliminate all risk from their portfolio" },
      { label: "B", text: "Accurately predict losses for individual policyholders" },
      { label: "C", text: "More accurately predict future losses for large groups of similar risks" },
      { label: "D", text: "Guarantee profits on every policy written" },
    ],
    correct_option: "C",
    sort_order: 2,
  },
  {
    question_text:
      "An insured fails to lock their car in a busy parking lot reasoning 'if it's stolen, I have insurance.' This is an example of which type of hazard?",
    options: [
      { label: "A", text: "Physical hazard" },
      { label: "B", text: "Moral hazard" },
      { label: "C", text: "Morale hazard" },
      { label: "D", text: "Legal hazard" },
    ],
    correct_option: "C",
    sort_order: 3,
  },
  {
    question_text:
      "John insured his house with ABC Insurance for $200,000. A fire destroyed the house. ABC will rebuild the house to its pre-loss condition but will not build a larger or more elaborate house. Which principle of insurance is being applied?",
    options: [
      { label: "A", text: "Utmost Good Faith" },
      { label: "B", text: "Subrogation" },
      { label: "C", text: "Indemnity" },
      { label: "D", text: "Contribution" },
    ],
    correct_option: "C",
    sort_order: 4,
  },
  {
    question_text:
      "After paying a claim, the insurer becomes entitled to recover the claim amount from the third party responsible for the loss. This principle is known as:",
    options: [
      { label: "A", text: "Contribution" },
      { label: "B", text: "Subrogation" },
      { label: "C", text: "Proximate Cause" },
      { label: "D", text: "Indemnity" },
    ],
    correct_option: "B",
    sort_order: 5,
  },
  {
    question_text:
      "John took a health insurance policy but did not disclose that he was a smoker at the time of purchase. He later filed a claim for cancer treatment. The insurer can deny the claim based on which principle?",
    options: [
      { label: "A", text: "Indemnity" },
      { label: "B", text: "Insurable Interest" },
      { label: "C", text: "Utmost Good Faith" },
      { label: "D", text: "Loss Minimization" },
    ],
    correct_option: "C",
    sort_order: 6,
  },
  {
    question_text:
      "What is the primary purpose of the underwriting function in insurance?",
    options: [
      { label: "A", text: "To process claims as quickly as possible" },
      { label: "B", text: "To sell the maximum number of policies" },
      { label: "C", text: "To determine risks, decide acceptability, and set appropriate premiums" },
      { label: "D", text: "To invest the company's surplus funds" },
    ],
    correct_option: "C",
    sort_order: 7,
  },
  {
    question_text:
      "A Field (Line) Underwriter's responsibilities include all of the following EXCEPT:",
    options: [
      { label: "A", text: "Evaluating individual insurance applications" },
      { label: "B", text: "Formulating overall underwriting policy for the company" },
      { label: "C", text: "Ensuring accurate classification and pricing" },
      { label: "D", text: "Managing their own book of business" },
    ],
    correct_option: "B",
    sort_order: 8,
  },
  {
    question_text:
      "In the insurance policy lifecycle, what is a binder?",
    options: [
      { label: "A", text: "A permanent insurance policy document" },
      { label: "B", text: "A temporary agreement providing coverage until the written policy is issued" },
      { label: "C", text: "A cancellation notice sent to the insured" },
      { label: "D", text: "A claim settlement document" },
    ],
    correct_option: "B",
    sort_order: 9,
  },
  {
    question_text:
      "Which of the following is NOT a type of policy transaction in the insurance lifecycle?",
    options: [
      { label: "A", text: "Endorsement" },
      { label: "B", text: "Cancellation" },
      { label: "C", text: "Arbitration" },
      { label: "D", text: "Renewal" },
    ],
    correct_option: "C",
    sort_order: 10,
  },
  {
    question_text:
      "The primary goal of ratemaking is to:",
    options: [
      { label: "A", text: "Maximize premiums collected from policyholders" },
      { label: "B", text: "Develop rates that enable the insurer to compete effectively while earning a reasonable profit" },
      { label: "C", text: "Minimize the number of claims filed" },
      { label: "D", text: "Set rates lower than all competitors" },
    ],
    correct_option: "B",
    sort_order: 11,
  },
  {
    question_text:
      "Class rating is best described as:",
    options: [
      { label: "A", text: "A rating approach using rates that reflect individual loss history" },
      { label: "B", text: "A rating approach using rates reflecting average probability of loss for large groups of similar risks" },
      { label: "C", text: "A rating method based solely on underwriter judgment" },
      { label: "D", text: "A method that only applies to personal insurance lines" },
    ],
    correct_option: "B",
    sort_order: 12,
  },
  {
    question_text:
      "Experience rating uses actual losses from prior policy periods (typically 3 years) compared to the class average. Which factor determines how much the premium is adjusted?",
    options: [
      { label: "A", text: "The number of employees" },
      { label: "B", text: "The credibility factor, largely determined by the size of the business" },
      { label: "C", text: "The geographic location of the business only" },
      { label: "D", text: "The insurer's total investment income" },
    ],
    correct_option: "B",
    sort_order: 13,
  },
  {
    question_text:
      "Alliance Safety Products carries Product Liability Insurance with an Aggregate limit of $2,000,000 and a Per Occurrence limit of $1,000,000. They face three separate lawsuits of $1,000,000 each in one policy period. How much will the insurer pay in total?",
    options: [
      { label: "A", text: "$3,000,000 — the per occurrence limit covers each claim" },
      { label: "B", text: "$2,000,000 — limited by the aggregate, so the third claim is unpaid" },
      { label: "C", text: "$1,000,000 — only the first claim is covered" },
      { label: "D", text: "$2,500,000 — a blended limit applies" },
    ],
    correct_option: "B",
    sort_order: 14,
  },
  {
    question_text:
      "What is the key difference between a Deductible and a Self-Insured Retention (SIR)?",
    options: [
      { label: "A", text: "A deductible is always higher than an SIR" },
      { label: "B", text: "With a deductible the insurer pays first then bills the insured; with SIR the insured pays first before the insurer steps in" },
      { label: "C", text: "SIR erodes the policy limit but a deductible does not" },
      { label: "D", text: "There is no practical difference between the two" },
    ],
    correct_option: "B",
    sort_order: 15,
  },
  {
    question_text:
      "CGL Coverage A covers which of the following?",
    options: [
      { label: "A", text: "Personal and advertising injury" },
      { label: "B", text: "Bodily injury and property damage liability" },
      { label: "C", text: "Medical payments" },
      { label: "D", text: "Workers' compensation" },
    ],
    correct_option: "B",
    sort_order: 16,
  },
  {
    question_text:
      "CGL Coverage B provides protection against claims related to:",
    options: [
      { label: "A", text: "Bodily injury from premises operations" },
      { label: "B", text: "Personal injury and advertising injury such as slander, libel, and false arrest" },
      { label: "C", text: "Product liability claims" },
      { label: "D", text: "Automobile liability claims" },
    ],
    correct_option: "B",
    sort_order: 17,
  },
  {
    question_text:
      "Under an Occurrence-based CGL policy, a covered incident occurs on December 7, 2009 during the policy period (Jan 1 - Dec 31, 2009), but the claim is reported on January 12, 2010. Will the policy respond?",
    options: [
      { label: "A", text: "No — the claim must be reported during the policy period" },
      { label: "B", text: "Yes — coverage applies because the incident occurred during the policy period, regardless of when the claim is filed" },
      { label: "C", text: "Only if the insured purchases tail coverage" },
      { label: "D", text: "Only if the insured renews the policy for 2010" },
    ],
    correct_option: "B",
    sort_order: 18,
  },
  {
    question_text:
      "An excess liability policy differs from the underlying primary policy in that it:",
    options: [
      { label: "A", text: "Provides broader coverage than the primary policy" },
      { label: "B", text: "Provides additional limits above the primary policy without broadening coverage" },
      { label: "C", text: "Replaces the primary policy entirely" },
      { label: "D", text: "Covers only workers' compensation claims" },
    ],
    correct_option: "B",
    sort_order: 19,
  },
  {
    question_text:
      "What is the key difference between an Excess Liability policy and an Umbrella Liability policy?",
    options: [
      { label: "A", text: "They are identical — the terms are interchangeable" },
      { label: "B", text: "An umbrella policy may cover some claims not covered by the underlying primary policies; an excess policy does not broaden coverage" },
      { label: "C", text: "An excess policy provides broader coverage than an umbrella" },
      { label: "D", text: "An umbrella policy only covers auto liability" },
    ],
    correct_option: "B",
    sort_order: 20,
  },
];

export async function POST(request: Request) {
  // Simple auth to prevent accidental runs
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // 1. Create admin user
    const { data: adminUser, error: adminError } =
      await admin.auth.admin.createUser({
        email: "admin@examplatform.com",
        password: "admin123456",
        email_confirm: true,
        user_metadata: { full_name: "Admin User", role: "admin" },
      });
    if (adminError && !adminError.message.includes("already been registered")) {
      throw adminError;
    }

    // 2. Create test candidates
    const candidates = [
      {
        email: "alice@example.com",
        password: "candidate123",
        full_name: "Alice Johnson",
      },
      {
        email: "bob@example.com",
        password: "candidate123",
        full_name: "Bob Smith",
      },
    ];

    for (const c of candidates) {
      const { error } = await admin.auth.admin.createUser({
        email: c.email,
        password: c.password,
        email_confirm: true,
        user_metadata: { full_name: c.full_name, role: "candidate" },
      });
      if (error && !error.message.includes("already been registered")) {
        throw error;
      }
    }

    // 3. Get admin profile ID
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .single();

    if (!adminProfile) throw new Error("Admin profile not found");

    // 4. Create the exam
    const { data: exam, error: examError } = await admin
      .from("exams")
      .insert({
        title: "Insurance Fundamentals — Comprehensive Assessment",
        description:
          "A 20-question assessment covering insurance concepts, principles, underwriting, policy lifecycle, ratemaking, limits, deductibles, CGL, and excess/umbrella insurance.",
        time_limit_minutes: 30,
        max_attempts: 2,
        is_live: false,
        created_by: adminProfile.id,
      })
      .select("id")
      .single();

    if (examError) throw examError;

    // 5. Insert questions
    const questionsWithExamId = QUESTIONS.map((q) => ({
      ...q,
      exam_id: exam.id,
    }));

    const { error: questionsError } = await admin
      .from("questions")
      .insert(questionsWithExamId);

    if (questionsError) throw questionsError;

    return NextResponse.json({
      success: true,
      message: "Seed complete",
      admin: { email: "admin@examplatform.com", password: "admin123456" },
      candidates: candidates.map((c) => ({
        email: c.email,
        password: c.password,
      })),
      exam: { id: exam.id, title: exam.title, questions: QUESTIONS.length },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Seed failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Add SEED_SECRET to env template**

Update `.env.local.example` to add:

```
SEED_SECRET=seed-dev-only
```

- [ ] **Step 4: Run the seed**

Start the dev server, then:

```bash
curl -X POST "http://localhost:3000/api/seed?secret=seed-dev-only"
```

Expected output:

```json
{
  "success": true,
  "message": "Seed complete",
  "admin": { "email": "admin@examplatform.com", "password": "admin123456" },
  "candidates": [
    { "email": "alice@example.com", "password": "candidate123" },
    { "email": "bob@example.com", "password": "candidate123" }
  ],
  "exam": { "id": "...", "title": "Insurance Fundamentals — Comprehensive Assessment", "questions": 20 }
}
```

- [ ] **Step 5: Manually verify the full flow**

1. Log in as admin (`admin@examplatform.com` / `admin123456`)
2. Verify dashboard shows 2 candidates, 1 exam
3. Go to Exams, open the insurance exam, verify 20 questions
4. Toggle exam to Live
5. Log out, log in as Alice (`alice@example.com` / `candidate123`)
6. Verify the exam appears on the dashboard
7. Start the exam, answer some questions, submit
8. Verify results page shows score and correct/wrong answers
9. Log back in as admin, check exam results — Alice's attempt should appear

- [ ] **Step 6: Commit**

```bash
git add supabase/seed.sql src/app/api/seed/ .env.local.example
git commit -m "feat: add seed data with admin, 2 candidates, and 20-question insurance exam"
```

---

### Task 15: Final Verification and Cleanup

**Files:**
- Modify: `src/app/candidate/exam/[id]/page.tsx` (if needed)

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: No lint errors (fix any that appear).

- [ ] **Step 4: Full manual smoke test**

Repeat the verification flow from Task 14 Step 5 to confirm everything works end to end.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix any lint/type issues from final verification"
```

Only commit if there were actual changes to make. If everything was clean, skip this step.
