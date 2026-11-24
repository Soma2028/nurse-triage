-- API の回数制限（セキュリティ）。Neon の SQL Editor で1回だけ実行する。
-- key は「何を・だれが」（例：code:user_xxx、subscribe:ip:1.2.3.4）。時間の区切りごとに数える。
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_start on rate_limits (window_start);
