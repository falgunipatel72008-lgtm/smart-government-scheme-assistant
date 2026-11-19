UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Aadhaar card or other valid government-issued photo identity proof.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Aadhaar card or other valid government-issued photo identity proof.'), '$.items');
