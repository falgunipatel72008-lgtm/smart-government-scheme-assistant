INSERT IGNORE INTO criteria_dimension (code, name, input_type, sort_order)
VALUES
  ('GENDER', 'Gender', 'SINGLE_SELECT', 10),
  ('MARITAL_STATUS', 'Marital Status', 'SINGLE_SELECT', 20),
  ('RESIDENCE_TYPE', 'Residence Type', 'SINGLE_SELECT', 30),
  ('SOCIAL_CATEGORY', 'Social Category', 'SINGLE_SELECT', 40),
  ('DISABILITY_STATUS', 'Disability Status', 'SINGLE_SELECT', 50),
  ('DISABILITY_PERCENT', 'Disability Percentage', 'NUMERIC', 60),
  ('WORK_STATUS', 'Work Status', 'SINGLE_SELECT', 70),
  ('EMPLOYMENT_TYPE', 'Employment Type', 'SINGLE_SELECT', 80),
  ('OCCUPATION', 'Occupation', 'MULTI_SELECT', 90),
  ('BPL_CARD', 'BPL Card', 'SINGLE_SELECT', 100),
  ('FAMILY_INCOME', 'Family Income', 'NUMERIC', 110),
  ('AGE', 'Age', 'NUMERIC', 120);
