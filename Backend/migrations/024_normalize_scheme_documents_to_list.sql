UPDATE schemes
SET documents = JSON_SET(
  COALESCE(documents, JSON_OBJECT('format', 'list', 'items', JSON_ARRAY())),
  '$.format',
  'list'
)
WHERE JSON_VALID(documents)
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(documents, '$.format')), '') <> 'list';
