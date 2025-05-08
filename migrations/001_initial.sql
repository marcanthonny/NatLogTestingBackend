-- Users are handled by Supabase Auth

-- Snapshots table
create table snapshots (
  id uuid default uuid_generate_v4() primary key,
  name text,
  date timestamp with time zone,
  week_number integer,
  ira_stats jsonb,
  cc_stats jsonb,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id)
);

-- Enable RLS
alter table snapshots enable row level security;

-- RLS Policies
create policy "Users can view snapshots" on snapshots
  for select using (true);

create policy "Users can create snapshots" on snapshots
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update own snapshots" on snapshots
  for update using (auth.uid() = user_id);

create policy "Users can delete own snapshots" on snapshots
  for delete using (auth.uid() = user_id);
