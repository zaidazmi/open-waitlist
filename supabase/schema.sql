create extension if not exists pgcrypto;
create schema if not exists private;

revoke all on schema private from public;

create sequence if not exists public.waitlist_position_seq;

create table if not exists private.waitlist_rate_limits (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (bucket, identifier, window_start)
);

create index if not exists waitlist_rate_limits_window_idx
  on private.waitlist_rate_limits (window_start);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version text not null default 'v1',
  verified boolean not null default false,
  verification_token uuid not null unique default gen_random_uuid(),
  referral_code text not null unique,
  referred_by text,
  referral_count integer not null default 0 check (referral_count >= 0),
  position integer not null unique default nextval('public.waitlist_position_seq')
);

create index if not exists waitlist_email_idx on public.waitlist (email);
create index if not exists waitlist_verification_token_idx on public.waitlist (verification_token);
create index if not exists waitlist_referral_code_idx on public.waitlist (referral_code);
create index if not exists waitlist_referred_by_idx on public.waitlist (referred_by);
create index if not exists waitlist_verified_position_idx on public.waitlist (verified, position);
create index if not exists waitlist_created_at_idx on public.waitlist (created_at);
create index if not exists waitlist_rank_idx
  on public.waitlist (verified, referral_count desc, created_at asc, id asc);

alter table public.waitlist enable row level security;

create or replace function public.set_waitlist_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_waitlist_updated_at on public.waitlist;

create trigger set_waitlist_updated_at
before update on public.waitlist
for each row
execute function public.set_waitlist_updated_at();

create or replace function public.check_waitlist_rate_limit(
  rate_bucket text,
  rate_identifier text,
  max_attempts integer,
  window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  now_ts timestamptz := now();
  window_start_ts timestamptz;
  reset_ts timestamptz;
  current_count integer;
begin
  if max_attempts <= 0 or window_seconds <= 0 then
    raise exception 'max_attempts and window_seconds must be positive';
  end if;

  window_start_ts := to_timestamp(
    floor(extract(epoch from now_ts) / window_seconds) * window_seconds
  );
  reset_ts := window_start_ts + make_interval(secs => window_seconds);

  insert into private.waitlist_rate_limits as limits (
    bucket,
    identifier,
    window_start,
    count
  )
  values (
    rate_bucket,
    rate_identifier,
    window_start_ts,
    1
  )
  on conflict (bucket, identifier, window_start)
  do update set count = limits.count + 1
  returning count into current_count;

  delete from private.waitlist_rate_limits
  where window_start < now_ts - interval '2 days';

  return query
  select
    current_count <= max_attempts,
    greatest(max_attempts - current_count, 0),
    reset_ts,
    greatest(1, ceil(extract(epoch from (reset_ts - now_ts)))::integer);
end;
$$;

drop function if exists public.increment_referral_count(text);

create or replace function public.waitlist_rank_for_code(ref_code text)
returns table (
  position integer,
  referral_count integer,
  referral_code text
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      waitlist.referral_code,
      waitlist.referral_count,
      cast(row_number() over (
        order by waitlist.referral_count desc, waitlist.created_at asc, waitlist.id asc
      ) as integer) as position
    from public.waitlist
    where waitlist.verified = true
  )
  select ranked.position, ranked.referral_count, ranked.referral_code
  from ranked
  where ranked.referral_code = ref_code
  limit 1;
$$;

create or replace function public.verify_waitlist_signup(token uuid)
returns table (
  user_email text,
  user_referral_code text,
  user_position integer,
  user_referral_count integer,
  referrer_email text,
  referrer_referral_code text,
  referrer_position integer,
  referrer_referral_count integer,
  already_verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_record public.waitlist%rowtype;
  computed_user_position integer;
  computed_user_referral_count integer;
  computed_referrer_position integer;
  referrer_email_value text;
  referrer_referral_code_value text;
  referrer_referral_count_value integer;
begin
  select *
  into signup_record
  from public.waitlist
  where verification_token = token
  for update;

  if not found then
    return;
  end if;

  already_verified := signup_record.verified;

  if not signup_record.verified then
    update public.waitlist
    set verified = true
    where id = signup_record.id
    returning * into signup_record;

    if signup_record.referred_by is not null
      and signup_record.referred_by <> signup_record.referral_code
    then
      update public.waitlist
      set referral_count = referral_count + 1
      where referral_code = signup_record.referred_by
        and verified = true
      returning email, referral_code, referral_count
      into referrer_email_value, referrer_referral_code_value, referrer_referral_count_value;
    end if;
  elsif signup_record.referred_by is not null
    and signup_record.referred_by <> signup_record.referral_code
  then
    select waitlist.email, waitlist.referral_code, waitlist.referral_count
    into referrer_email_value, referrer_referral_code_value, referrer_referral_count_value
    from public.waitlist
    where waitlist.referral_code = signup_record.referred_by
      and waitlist.verified = true;
  end if;

  select rank_data.position, rank_data.referral_count
  into computed_user_position, computed_user_referral_count
  from public.waitlist_rank_for_code(signup_record.referral_code) as rank_data;

  if referrer_referral_code_value is not null then
    select rank_data.position
    into computed_referrer_position
    from public.waitlist_rank_for_code(referrer_referral_code_value) as rank_data;
  end if;

  return query
  select
    signup_record.email,
    signup_record.referral_code,
    coalesce(computed_user_position, signup_record.position),
    coalesce(computed_user_referral_count, signup_record.referral_count),
    referrer_email_value,
    referrer_referral_code_value,
    computed_referrer_position,
    referrer_referral_count_value,
    already_verified;
end;
$$;

revoke all on function public.waitlist_rank_for_code(text) from public;
revoke all on function public.verify_waitlist_signup(uuid) from public;
revoke all on function public.check_waitlist_rate_limit(text, text, integer, integer) from public;
grant execute on function public.waitlist_rank_for_code(text) to service_role;
grant execute on function public.verify_waitlist_signup(uuid) to service_role;
grant execute on function public.check_waitlist_rate_limit(text, text, integer, integer) to service_role;
