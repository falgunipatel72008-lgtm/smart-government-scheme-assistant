UPDATE schemes
SET documents = JSON_ARRAY_APPEND(documents, '$.items', 'Bank account or passbook details for benefit transfer.')
WHERE NOT JSON_CONTAINS(documents, JSON_QUOTE('Bank account or passbook details for benefit transfer.'), '$.items');
