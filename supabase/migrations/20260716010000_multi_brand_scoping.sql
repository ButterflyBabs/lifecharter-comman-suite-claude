-- Multi-brand/multi-business enhancements (Phase 8's last deferred item):
-- lets a workspace running multiple brands/divisions attribute clients,
-- leads, opportunities, invoices, and campaigns to a specific business
-- unit instead of one flat workspace-wide list. business_unit_id is
-- optional (nullable) — a workspace with a single business isn't forced
-- to pick one. No new RLS boundary: business units already live inside
-- the same workspace_id tenant boundary every policy since Phase 1
-- enforces, so this is an added attribute, not a new isolation surface.

alter table public.clients add column business_unit_id uuid references public.business_units(id) on delete set null;
alter table public.leads add column business_unit_id uuid references public.business_units(id) on delete set null;
alter table public.opportunities add column business_unit_id uuid references public.business_units(id) on delete set null;
alter table public.invoices add column business_unit_id uuid references public.business_units(id) on delete set null;
alter table public.campaigns add column business_unit_id uuid references public.business_units(id) on delete set null;

create index if not exists clients_business_unit_id_idx on public.clients(business_unit_id);
create index if not exists leads_business_unit_id_idx on public.leads(business_unit_id);
create index if not exists opportunities_business_unit_id_idx on public.opportunities(business_unit_id);
create index if not exists invoices_business_unit_id_idx on public.invoices(business_unit_id);
create index if not exists campaigns_business_unit_id_idx on public.campaigns(business_unit_id);

-- Defense in depth: a row's business_unit_id must belong to a business
-- unit in the *same* workspace as the row itself. Without this, a form
-- bug (or a direct API call) could attribute a client to another
-- workspace's business unit — not a read-isolation break (RLS still
-- blocks reading that other workspace's rows), but a data-integrity one
-- worth closing at the database layer rather than trusting every form.
create or replace function private.enforce_business_unit_same_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_unit_id is not null then
    if not exists (
      select 1 from public.business_units
      where id = new.business_unit_id
      and workspace_id = new.workspace_id
    ) then
      raise exception 'business_unit_id must belong to the same workspace as this record';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_business_unit_same_workspace
  before insert or update on public.clients
  for each row execute function private.enforce_business_unit_same_workspace();

create trigger enforce_business_unit_same_workspace
  before insert or update on public.leads
  for each row execute function private.enforce_business_unit_same_workspace();

create trigger enforce_business_unit_same_workspace
  before insert or update on public.opportunities
  for each row execute function private.enforce_business_unit_same_workspace();

create trigger enforce_business_unit_same_workspace
  before insert or update on public.invoices
  for each row execute function private.enforce_business_unit_same_workspace();

create trigger enforce_business_unit_same_workspace
  before insert or update on public.campaigns
  for each row execute function private.enforce_business_unit_same_workspace();
