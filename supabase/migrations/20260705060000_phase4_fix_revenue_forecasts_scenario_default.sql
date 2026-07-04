-- revenue_forecasts.scenario defaulted to 'base', which isn't one of its own
-- check constraint's allowed values (best_case/base_case/downside) — would
-- only surface if a row were ever inserted relying on the default rather than
-- specifying scenario explicitly (the UI always does), but it's a real latent
-- bug worth closing now rather than leaving for someone to hit later.
alter table public.revenue_forecasts alter column scenario set default 'base_case';
