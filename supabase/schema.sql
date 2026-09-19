-- =====================================================================
-- Salem & Wafaa — Engagement Invitation (Supabase schema)
-- Run this in the Supabase SQL editor after creating your project.
-- =====================================================================

-- ---------- Settings (single row, JSON payload) ----------
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.settings (id, data, updated_at)
values (1, '{}'::jsonb, now())
on conflict (id) do nothing;

-- ---------- RSVP responses ----------
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  guests integer not null default 1 check (guests >= 0),
  attending boolean,
  message text default null,
  submitted_by text
);

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);

-- ---------- Invitees (people you plan to send the invitation to) ----------
create table if not exists public.invitees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  guests integer not null default 1 check (guests >= 1 and guests <= 50),
  phone text default null,
  note text default null
);

create index if not exists invitees_created_at_idx on public.invitees (created_at desc);

-- ---------- Grants (explicit, so the roles always have table privileges) ----------
grant usage on schema public to anon, authenticated;
grant select on public.settings to anon;
grant insert on public.rsvps to anon, authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant select, delete on public.rsvps to authenticated;
grant select, insert, update, delete on public.invitees to authenticated;

-- ---------- Row Level Security ----------
alter table public.settings enable row level security;
alter table public.rsvps enable row level security;
alter table public.invitees enable row level security;

-- Guests (anonymous) may read settings and submit RSVPs.
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings
  for select using (true);

drop policy if exists "rsvps public insert" on public.rsvps;
create policy "rsvps public insert" on public.rsvps
  for insert with check (true);

-- Administrators (authenticated) manage both. "for all" covers
-- INSERT, UPDATE and DELETE in a single policy.
drop policy if exists "settings admin read" on public.settings;
drop policy if exists "settings admin update" on public.settings;
drop policy if exists "settings admin all" on public.settings;
create policy "settings admin all" on public.settings
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists "rsvps admin read" on public.rsvps;
create policy "rsvps admin read" on public.rsvps
  for select to authenticated using (true);

drop policy if exists "rsvps admin delete" on public.rsvps;
create policy "rsvps admin delete" on public.rsvps
  for delete to authenticated using (true);

drop policy if exists "invitees admin all" on public.invitees;
create policy "invitees admin all" on public.invitees
  for all to authenticated
  using (true)
  with check (true);

-- ---------- Storage bucket for photos / video / music ----------
insert into storage.buckets (id, name, public)
values ('invite-media', 'invite-media', true)
on conflict (id) do nothing;

-- Public read for media (so guests can load photos/music).
create policy "media public read" on storage.objects
  for select using (bucket_id = 'invite-media');

-- Administrators may upload, update and delete media.
create policy "media admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invite-media');

create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'invite-media');

create policy "media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'invite-media');