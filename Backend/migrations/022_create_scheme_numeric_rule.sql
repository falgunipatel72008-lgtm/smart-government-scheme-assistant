CREATE TABLE scheme_numeric_rule (
  scheme_id INT UNSIGNED NOT NULL,
  dimension_id TINYINT UNSIGNED NOT NULL,
  min_value DECIMAL(14,2) NULL,
  max_value DECIMAL(14,2) NULL,
  PRIMARY KEY (scheme_id, dimension_id),
  CONSTRAINT fk_scheme_numeric_rule_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_numeric_rule_dimension
    FOREIGN KEY (dimension_id) REFERENCES criteria_dimension(id)
) ENGINE=InnoDB;
