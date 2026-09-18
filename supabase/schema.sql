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

-- ---------- Row Level Security ----------
alter table public.settings enable row level security;
alter table public.rsvps enable row level security;

-- Guests (anonymous) may read settings and submit RSVPs.
create policy "settings public read" on public.settings
  for select using (true);

create policy "rsvps public insert" on public.rsvps
  for insert with check (true);

-- Administrators (authenticated) manage both.
create policy "settings admin read" on public.settings
  for select using (auth.role() = 'authenticated');

create policy "settings admin update" on public.settings
  for update using (auth.role() = 'authenticated');

create policy "rsvps admin read" on public.rsvps
  for select using (auth.role() = 'authenticated');

create policy "rsvps admin delete" on public.rsvps
  for delete using (auth.role() = 'authenticated');

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