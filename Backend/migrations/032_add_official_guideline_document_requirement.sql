UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Additional documents listed in the current official scheme guidelines.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Additional documents listed in the current official scheme guidelines.'), '$.items');
