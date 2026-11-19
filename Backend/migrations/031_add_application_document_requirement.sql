UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Completed application form and scheme-specific declaration.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Completed application form and scheme-specific declaration.'), '$.items');
