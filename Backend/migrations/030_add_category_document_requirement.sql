UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Income, caste, disability, or category certificate if applicable.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Income, caste, disability, or category certificate if applicable.'), '$.items');
