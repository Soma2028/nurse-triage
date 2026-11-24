-- ブロック（SPEC-social.md の 4）。段階4の前に Neon の SQL Editor で1回だけ実行する。
create table blocks (
  blocker text not null references profiles(user_id) on delete cascade,
  blocked text not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index blocks_blocked on blocks (blocked);
