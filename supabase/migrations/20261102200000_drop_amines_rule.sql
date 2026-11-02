-- "Amines" has no agreed definition or cutoff and no food is rated for it,
-- so every food on Low Histamine showed "amines not rated yet". Histamine
-- and tyramine cover the main amines. The column stays, unused.
DELETE FROM protocol_rules
WHERE rule_type = 'property'
  AND property_name = 'amines'
  AND protocol_id IN (SELECT id FROM protocols WHERE name = 'Low Histamine');
