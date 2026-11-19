UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Current address proof.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Current address proof.'), '$.items');
