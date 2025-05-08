-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users are handled by Supabase Auth automatically
-- We can extend the auth.users table with additional fields
alter table auth.users add column if not exists role text default 'viewer';
alter table auth.users add column if not exists active boolean default true;
alter table auth.users add column if not exists last_login timestamp with time zone;

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  token text not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '24 hours')
);

-- Batch corrections table
create table if not exists public.batch_corrections (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone not null,
  do_number text not null unique,
  material_code text not null,
  quantity numeric not null,
  material_description text not null,
  batch_system text not null,
  physical_batch text not null,
  expired_date_system timestamp with time zone not null,
  physical_expired_date timestamp with time zone not null,
  user_picker_code text not null,
  created_at timestamp with time zone default now()
);

-- Snapshots table with JSON stats
create table if not exists public.snapshots (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id text unique not null,
  name text,
  date timestamp with time zone not null,
  week_number integer,
  ira_stats jsonb not null default '{}'::jsonb,
  cc_stats jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Week configuration table
create table if not exists public.week_configs (
  id uuid primary key default uuid_generate_v4(),
  ira_config jsonb not null default '{
    "week1": {"target": 99},
    "week2": {"target": 99},
    "week3": {"target": 99},
    "week4": {"target": 99}
  }'::jsonb,
  cc_config jsonb not null default '{
    "week1": {"target": 25},
    "week2": {"target": 50},
    "week3": {"target": 75},
    "week4": {"target": 99}
  }'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Roles and permissions
create table if not exists public.roles (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  description text not null,
  permissions text[] not null default '{}',
  allowed_sites text[] not null default '{}',
  is_custom boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add Row Level Security (RLS) policies
alter table public.sessions enable row level security;
alter table public.batch_corrections enable row level security;
alter table public.snapshots enable row level security;
alter table public.week_configs enable row level security;
alter table public.roles enable row level security;

-- RLS Policies
create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can view batch corrections"
  on public.batch_corrections for select
  using (true);

create policy "Admin users can manage batch corrections"
  on public.batch_corrections for all
  using (auth.role() = 'admin');

create policy "Users can view snapshots"
  on public.snapshots for select
  using (true);

create policy "Admin users can manage snapshots"
  on public.snapshots for all
  using (auth.role() = 'admin');
