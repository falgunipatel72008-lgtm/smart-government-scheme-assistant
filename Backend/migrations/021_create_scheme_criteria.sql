CREATE TABLE scheme_criteria (
  scheme_id INT UNSIGNED NOT NULL,
  criteria_option_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (scheme_id, criteria_option_id),
  KEY idx_scheme_criteria_option (criteria_option_id),
  CONSTRAINT fk_scheme_criteria_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_criteria_option
    FOREIGN KEY (criteria_option_id) REFERENCES criteria_option(id)
) ENGINE=InnoDB;
