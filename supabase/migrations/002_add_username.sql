-- Add username column to profiles
-- Safe: does NOT delete or overwrite any existing data

-- Step 1: Add column (nullable first to avoid issues with existing rows)
alter table public.profiles add column if not exists username text;

-- Step 2: Backfill existing rows — set username = email where username is null
update public.profiles set username = email where username is null;

-- Step 3: Make it not null now that all rows have values
alter table public.profiles alter column username set not null;

-- Step 4: Add unique constraint
alter table public.profiles add constraint profiles_username_unique unique (username);

-- Step 5: Set tirtha's username (only if the user exists, safe)
update public.profiles
set username = 'tirtha'
where email = 'tirtha.chakravarty@xceedance.com';

-- Step 6: Update the trigger to set username = email for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'candidate'),
    coalesce(new.raw_user_meta_data->>'username', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;
