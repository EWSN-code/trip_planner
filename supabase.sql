create table if not exists public.travel_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":1,"trips":[],"settings":{}}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.travel_state enable row level security;
revoke all on public.travel_state from anon;
grant select, insert, update, delete on public.travel_state to authenticated;
drop policy if exists "travel_state_select_own" on public.travel_state;
create policy "travel_state_select_own" on public.travel_state for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "travel_state_insert_own" on public.travel_state;
create policy "travel_state_insert_own" on public.travel_state for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "travel_state_update_own" on public.travel_state;
create policy "travel_state_update_own" on public.travel_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "travel_state_delete_own" on public.travel_state;
create policy "travel_state_delete_own" on public.travel_state for delete to authenticated using ((select auth.uid())=user_id);
