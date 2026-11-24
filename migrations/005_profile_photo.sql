-- プロフィールの写真（アイコン）。Neon の SQL Editor で1回だけ実行する。
-- 端末で 128px の正方形の JPEG に縮めた data URL（数KB）を入れる。写真がなければ null（絵のアイコンを使う）。
alter table profiles add column photo text;
