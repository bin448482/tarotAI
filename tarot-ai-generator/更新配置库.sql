-- SQLite
-- DELETE FROM dimension WHERE id IN (101);

-- DELETE FROM dimension_translation WHERE dimension_id IN (101);

DELETE from card_interpretation_dimension where dimension_id in (107,108,109,112,113,114,115);
DELETE from card_interpretation_dimension_translation where dimension_interpretation_id not in (select id from card_interpretation_dimension);

-- DELETE FROM dimension WHERE id >= 95;
-- DELETE FROM dimension_translation WHERE dimension_id >= 95;

-- SELECT description from dimension where id = 107;

-- DELETE FROM card_interpretation_dimension_translation
-- WHERE dimension_id = 112;

-- UPDATE dimension_translation
-- SET category = 'Fortune'
-- WHERE dimension_id >= 116 AND id <= 120;
