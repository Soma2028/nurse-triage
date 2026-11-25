-- サーバーのエラーの記録（持ち主に通知で知らせるため）。Neon の SQL Editor で1回だけ実行する。
-- 実行していなくても API は止まらない（記録しないだけ）。中身（ユーザーの入力・課題）は残さない
create table api_errors (
  id bigserial primary key,
  at timestamptz not null default now(),
  route text not null,          -- /api/friends など
  status int not null,          -- 500 など
  code text,                    -- データベースのエラーの種類（SQLSTATE の5文字）など。なければ null
  alerted boolean not null default false  -- 持ち主に知らせたか
);
create index api_errors_alerted on api_errors (alerted) where not alerted;
