-- 通知機能のテーブル。Neon の SQL Editor に貼って1回だけ実行する。
-- 課題名（reminders.title）は「通知に課題名を出す」が ON の端末だけ入る。

create table devices (
  id uuid primary key,
  secret_hash text not null,          -- secret の SHA-256
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table subscriptions (
  endpoint text primary key,
  device_id uuid not null references devices(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index subscriptions_device_id on subscriptions (device_id);

create table reminders (
  device_id uuid not null references devices(id) on delete cascade,
  task_id text not null,
  type text not null,
  title text,                          -- 「課題名を通知に出す」が ON のときだけ入る
  due timestamptz not null,
  done boolean not null default false,
  primary key (device_id, task_id)
);
-- cron で「これから締切の来る未完了の課題」を探すため
create index reminders_due on reminders (due) where not done;

create table sent (
  device_id uuid not null references devices(id) on delete cascade,
  task_id text not null,
  kind text not null,                  -- 'eve' | 'h3' | 'morning'
  due timestamptz not null,            -- 締切が変わったら送り直せるようにキーに含める
  sent_at timestamptz not null default now(),
  primary key (device_id, task_id, kind, due)
);
