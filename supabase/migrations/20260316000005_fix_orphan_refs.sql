-- ============================================================
-- Migration 029: Fix orphan church references from previous dupe cleanup
-- Date: 2026-03-16
-- ============================================================

-- Gilvan and Wagner still reference deleted Caucaia church 5673fe8f
-- Replace with the correct Caucaia church 2b072b3a
UPDATE missionarios
SET igrejas_responsavel = array_replace(
  igrejas_responsavel,
  '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79'::uuid,
  '2b072b3a-42c4-4ed6-bf59-c735c8f0406e'::uuid
)
WHERE '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79'::uuid = ANY(igrejas_responsavel);
