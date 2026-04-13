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
