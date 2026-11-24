-- ログイン・プロフィール・フレンド・応援のテーブル（SPEC-social.md）。
-- Neon の SQL Editor に貼って1回だけ実行する。課題名・課題の中身はここには入れない。

create table profiles (
  user_id text primary key,               -- Clerk のユーザー ID
  nickname text not null,
  icon text not null,
  grade smallint,                         -- 1〜4。null は「ひみつ」
  bio text not null default '',
  friend_code text not null unique,       -- 8文字。作り直せる
  share_progress boolean not null default true,
  created_at timestamptz not null default now()
);

create table friend_requests (
  from_user text not null references profiles(user_id) on delete cascade,
  to_user text not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
create index friend_requests_to_user on friend_requests (to_user);

create table friendships (
  user_a text not null references profiles(user_id) on delete cascade,
  user_b text not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)                 -- 1組を1行にする
);
create index friendships_user_b on friendships (user_b);

create table progress (
  user_id text primary key references profiles(user_id) on delete cascade,
  day date not null,                      -- 日本時間の日付
  done_count int not null default 0,      -- その日に完了にした課題の数
  red_count int not null default 0,       -- いまの赤の課題の数
  updated_at timestamptz not null default now()
);

create table cheers (
  id bigserial primary key,
  from_user text not null references profiles(user_id) on delete cascade,
  to_user text not null references profiles(user_id) on delete cascade,
  stamp text not null,                    -- 'ganbare' | 'otsukare' | 'issho' | 'erai'
  created_at timestamptz not null default now()
);
create index cheers_to_user on cheers (to_user, created_at desc);

-- 応援を通知で届けるため、ログインした端末にだけユーザー ID を付ける
alter table devices add column user_id text;
create index devices_user_id on devices (user_id) where user_id is not null;
