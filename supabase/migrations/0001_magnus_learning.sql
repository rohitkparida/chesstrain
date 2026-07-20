create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  chesscom_username text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  subtype text not null,
  elo numeric not null default 1200,
  confidence numeric not null default 350,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill, subtype)
);

create table if not exists public.training_attempts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  module text not null,
  score numeric not null check (score >= 0 and score <= 1),
  assistance text not null default 'none',
  duration_ms integer not null default 0,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  result text,
  source text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  repetition integer not null default 0,
  interval_days numeric not null default 0,
  ease_factor numeric not null default 2.5,
  next_review_at timestamptz not null default now(),
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists public.chesscom_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  pgn text not null,
  game_metadata jsonb not null default '{}'::jsonb,
  analyzed_version text,
  imported_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.mistake_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  game_id text not null,
  ply integer not null,
  fen text not null,
  exercise jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists training_attempts_user_completed_idx on public.training_attempts(user_id, completed_at desc);
create index if not exists srs_cards_due_idx on public.srs_cards(user_id, next_review_at);
create index if not exists games_user_imported_idx on public.chesscom_games(user_id, imported_at desc);

alter table public.profiles enable row level security;
alter table public.skill_ratings enable row level security;
alter table public.training_attempts enable row level security;
alter table public.srs_cards enable row level security;
alter table public.chesscom_games enable row level security;
alter table public.mistake_exercises enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "ratings own rows" on public.skill_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts own rows" on public.training_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "srs own rows" on public.srs_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "games own rows" on public.chesscom_games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mistakes own rows" on public.mistake_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
