-- Yes/no: the food is listed in peer-reviewed clinical reviews as possibly
-- releasing histamine in the body ("histamine liberator"). Clinical opinion,
-- not lab data; citations live in food_trigger_properties.sources.
alter table food_trigger_properties
  add column if not exists histamine_liberator boolean default false;

-- Low Histamine: liberators are "limit and test", not "avoid" (weak evidence).
insert into protocol_rules (protocol_id, rule_type, property_name, property_values, status, rule_order, notes)
select p.id, 'property', 'histamine_liberator', array['true'], 'caution',
       coalesce((select max(rule_order) from protocol_rules r where r.protocol_id = p.id), 0) + 1,
       'Listed in clinical reviews as possibly releasing histamine; evidence is limited, so test your tolerance'
from protocols p
where p.name = 'Low Histamine'
  and not exists (
    select 1 from protocol_rules r where r.protocol_id = p.id and r.property_name = 'histamine_liberator'
  );
