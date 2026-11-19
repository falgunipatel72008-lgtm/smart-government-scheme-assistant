UPDATE schemes
SET documents = JSON_OBJECT(
  'format',
  'list',
  'items',
  IF(
    JSON_VALID(documents)
      AND JSON_TYPE(JSON_EXTRACT(documents, '$.items')) = 'ARRAY',
    JSON_EXTRACT(documents, '$.items'),
    JSON_ARRAY()
  )
);
