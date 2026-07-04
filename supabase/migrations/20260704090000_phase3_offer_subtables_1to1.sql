-- offer_pricing, offer_capacity_models, and offer_economics were documented as
-- 1:1 with an offer_version but never got the constraint enforcing it —
-- needed so the Pricing and Economics page can upsert cleanly instead of
-- accumulating duplicate rows per version.
alter table public.offer_pricing add constraint offer_pricing_offer_version_id_key unique (offer_version_id);
alter table public.offer_capacity_models add constraint offer_capacity_models_offer_version_id_key unique (offer_version_id);
alter table public.offer_economics add constraint offer_economics_offer_version_id_key unique (offer_version_id);
