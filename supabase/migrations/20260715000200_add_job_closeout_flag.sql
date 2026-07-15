-- Preserve the prototype closeout flag during legacy/production round trips.

alter table public.jobs
add column if not exists thank_you_sent boolean not null default false;

comment on column public.jobs.thank_you_sent is
  'Legacy-compatible closeout flag used by the current dashboard until communications are modeled separately.';
