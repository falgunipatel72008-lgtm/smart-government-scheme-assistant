UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Passport-size photograph(s), if requested.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Passport-size photograph(s), if requested.'), '$.items');
