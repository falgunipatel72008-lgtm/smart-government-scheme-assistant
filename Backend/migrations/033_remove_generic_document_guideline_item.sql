UPDATE schemes
SET documents = JSON_REMOVE(
  documents,
  '$.items[0]'
)
WHERE JSON_CONTAINS(documents, JSON_QUOTE('Check the current official guidelines for the documents required for the selected scheme component.'), '$.items')
  AND JSON_UNQUOTE(JSON_EXTRACT(documents, '$.items[0]')) = 'Check the current official guidelines for the documents required for the selected scheme component.';
