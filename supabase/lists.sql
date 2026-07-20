-- Miscellaneous to-do lists ("Lists" tab).
--
-- These are intentionally separate from the `tasks` table: list items do NOT
-- track to a quadrant or a value. Run this once in the Supabase SQL editor
-- (Dashboard → SQL → New query) for your project.

-- Named lists (e.g. "Groceries", "Packing").
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Items belonging to a list. Deleting a list cascade-deletes its items.
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists list_items_list_id_idx on public.list_items (list_id);

-- Row-level security: each user only sees and edits their own rows.
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "Users manage their own lists"
  on public.lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own list items"
  on public.list_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
