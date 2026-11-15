CREATE TABLE scheme_genders (
  scheme_id INT UNSIGNED NOT NULL,
  gender_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (scheme_id, gender_id),
  KEY idx_scheme_genders_gender (gender_id),
  CONSTRAINT fk_scheme_genders_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_genders_gender
    FOREIGN KEY (gender_id) REFERENCES master_gender(id)
) ENGINE=InnoDB;
