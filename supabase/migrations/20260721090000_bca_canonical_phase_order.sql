-- Adopt the canonical Business Command Audit phase order (v1 question bank).
-- The bank's phaseOrder is the authoritative sequence; align
-- business_command_domains.display_order to it. roadmap_phases sequence is
-- score-derived at generation time (not display_order), so this is safe.
-- Offset first to avoid any unique-collision while permuting.
update public.business_command_domains set display_order = display_order + 100;

update public.business_command_domains set display_order = case code
  when 'founder_leadership' then 1
  when 'vision_strategy' then 2
  when 'market_positioning' then 3
  when 'offers_pricing' then 4
  when 'brand_messaging' then 5
  when 'sales_revenue' then 6
  when 'client_journey_delivery' then 7
  when 'client_success_retention' then 8
  when 'marketing_growth' then 9
  when 'finance_legal_risk' then 10
  when 'operations_systems_technology' then 11
  when 'team_capacity' then 12
  else display_order
end;
